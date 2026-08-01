import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    ActiveConstellationsNotFoundError,
    CometRecommendationAlreadyRespondedError,
    CometRecommendationExpiredError,
    CometRecommendationNotFoundError,
    CometRecommendationUnavailableError,
    NorthStarNotFoundError,
)
from app.models.comet import Comet
from app.models.comet_recommendation import CometRecommendation
from app.models.north_star import NorthStar
from app.schemas.comet import (
    CometRecommendationGenerateResponse,
    CometRecommendationItem,
    CometRecommendationResponse,
    CometRecommendationStatus,
    CometSourceType,
    CometStatus,
    HomeCometRecommendation,
)
from app.services.comet_deficiency import (
    count_stars_by_category,
    find_recommendable_category,
    get_active_selected_categories,
    has_recent_duplicate_title,
)
from app.services.comet_recommendation_ai import (
    generate_comet_recommendation,
    get_comet_recommendation_prompt_version,
)
from app.services.upstage import UpstageClient


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _to_item(recommendation: CometRecommendation) -> CometRecommendationItem:
    return CometRecommendationItem(
        id=str(recommendation.id),
        target_category=recommendation.target_category,
        title=recommendation.title,
        description=recommendation.description,
        reason=recommendation.reason,
        estimated_minutes=recommendation.estimated_minutes,
        expires_at=_as_utc(recommendation.expires_at),
    )


def _to_home_item(recommendation: CometRecommendation) -> HomeCometRecommendation:
    return HomeCometRecommendation(
        id=str(recommendation.id),
        target_category=recommendation.target_category,
        title=recommendation.title,
        estimated_minutes=recommendation.estimated_minutes,
    )


def _expire_stale_recommendations(db: Session, user_id: uuid.UUID) -> None:
    now = datetime.now(UTC)
    stale = (
        db.query(CometRecommendation)
        .filter(
            CometRecommendation.user_id == user_id,
            CometRecommendation.status == CometRecommendationStatus.PENDING.value,
            CometRecommendation.expires_at < now,
        )
        .all()
    )
    for recommendation in stale:
        recommendation.status = CometRecommendationStatus.EXPIRED.value
    if stale:
        db.commit()


def get_pending_recommendation(
    db: Session, user_id: uuid.UUID
) -> CometRecommendation | None:
    _expire_stale_recommendations(db, user_id)
    now = datetime.now(UTC)
    return (
        db.query(CometRecommendation)
        .filter(
            CometRecommendation.user_id == user_id,
            CometRecommendation.status == CometRecommendationStatus.PENDING.value,
            CometRecommendation.expires_at >= now,
        )
        .order_by(CometRecommendation.created_at.desc())
        .first()
    )


def get_current_recommendation(
    db: Session, user_id: uuid.UUID
) -> CometRecommendationResponse:
    recommendation = get_pending_recommendation(db, user_id)
    return CometRecommendationResponse(
        recommendation=_to_item(recommendation) if recommendation else None
    )


def get_home_comet_recommendation(
    db: Session, user_id: uuid.UUID
) -> HomeCometRecommendation | None:
    recommendation = get_pending_recommendation(db, user_id)
    if recommendation is None:
        return None
    return _to_home_item(recommendation)


def _get_active_north_star(db: Session, user_id: uuid.UUID) -> NorthStar:
    north_star = (
        db.query(NorthStar)
        .filter(NorthStar.user_id == user_id, NorthStar.is_active.is_(True))
        .one_or_none()
    )
    if north_star is None:
        raise NorthStarNotFoundError()
    return north_star


def generate_recommendation(
    db: Session,
    user_id: uuid.UUID,
    client: UpstageClient,
) -> CometRecommendationGenerateResponse:
    existing = get_pending_recommendation(db, user_id)
    if existing is not None:
        return CometRecommendationGenerateResponse(
            recommendation=_to_item(existing),
            reused=True,
        )

    north_star = _get_active_north_star(db, user_id)
    active_categories = get_active_selected_categories(db, user_id)
    if not active_categories:
        raise ActiveConstellationsNotFoundError()

    target_category = find_recommendable_category(db, user_id, active_categories)
    if target_category is None:
        raise CometRecommendationUnavailableError()

    star_counts = count_stars_by_category(db, user_id, active_categories)
    ai_result = generate_comet_recommendation(
        target_category=target_category,
        north_star_text=north_star.original_text,
        star_counts=star_counts,
        client=client,
    )

    if has_recent_duplicate_title(db, user_id, ai_result.title):
        raise CometRecommendationUnavailableError(
            "최근 동일한 추천이 있어 새 혜성 추천을 생성할 수 없습니다."
        )

    now = datetime.now(UTC)
    recommendation = CometRecommendation(
        user_id=user_id,
        target_category=ai_result.target_category,
        title=ai_result.title,
        description=ai_result.description,
        reason=ai_result.reason,
        estimated_minutes=ai_result.estimated_minutes,
        status=CometRecommendationStatus.PENDING.value,
        model_name=settings.upstage_model,
        prompt_version=get_comet_recommendation_prompt_version(),
        expires_at=now + timedelta(hours=settings.comet_recommendation_ttl_hours),
    )
    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)

    return CometRecommendationGenerateResponse(
        recommendation=_to_item(recommendation),
        reused=False,
    )


def _get_user_recommendation(
    db: Session, user_id: uuid.UUID, recommendation_id: uuid.UUID
) -> CometRecommendation:
    recommendation = db.get(CometRecommendation, recommendation_id)
    if recommendation is None or recommendation.user_id != user_id:
        raise CometRecommendationNotFoundError()
    return recommendation


def accept_recommendation(
    db: Session,
    user_id: uuid.UUID,
    recommendation_id: uuid.UUID,
) -> Comet:
    recommendation = _get_user_recommendation(db, user_id, recommendation_id)

    if recommendation.status == CometRecommendationStatus.ACCEPTED.value:
        existing = (
            db.query(Comet)
            .filter(Comet.recommendation_id == recommendation.id)
            .one_or_none()
        )
        if existing is None:
            raise CometRecommendationNotFoundError()
        return existing

    if recommendation.status == CometRecommendationStatus.REJECTED.value:
        raise CometRecommendationAlreadyRespondedError("거절한 추천은 수락할 수 없습니다.")

    if recommendation.status == CometRecommendationStatus.EXPIRED.value:
        raise CometRecommendationExpiredError()

    if recommendation.status != CometRecommendationStatus.PENDING.value:
        raise CometRecommendationAlreadyRespondedError()

    if _as_utc(recommendation.expires_at) < datetime.now(UTC):
        recommendation.status = CometRecommendationStatus.EXPIRED.value
        db.commit()
        raise CometRecommendationExpiredError()

    try:
        recommendation.status = CometRecommendationStatus.ACCEPTED.value
        recommendation.responded_at = datetime.now(UTC)

        comet = Comet(
            user_id=user_id,
            source_type=CometSourceType.AI_RECOMMENDATION.value,
            recommendation_id=recommendation.id,
            target_category=recommendation.target_category,
            title=recommendation.title,
            description=recommendation.description,
            reason=recommendation.reason,
            status=CometStatus.PENDING.value,
        )
        db.add(comet)
        db.commit()
        db.refresh(comet)
    except Exception:
        db.rollback()
        existing = (
            db.query(Comet)
            .filter(Comet.recommendation_id == recommendation.id)
            .one_or_none()
        )
        if existing is not None:
            return existing
        raise

    return comet


def reject_recommendation(
    db: Session,
    user_id: uuid.UUID,
    recommendation_id: uuid.UUID,
) -> CometRecommendationItem:
    recommendation = _get_user_recommendation(db, user_id, recommendation_id)

    if recommendation.status == CometRecommendationStatus.REJECTED.value:
        return _to_item(recommendation)

    if recommendation.status != CometRecommendationStatus.PENDING.value:
        raise CometRecommendationAlreadyRespondedError()

    if _as_utc(recommendation.expires_at) < datetime.now(UTC):
        recommendation.status = CometRecommendationStatus.EXPIRED.value
        db.commit()
        raise CometRecommendationExpiredError()

    recommendation.status = CometRecommendationStatus.REJECTED.value
    recommendation.responded_at = datetime.now(UTC)
    db.commit()
    db.refresh(recommendation)
    return _to_item(recommendation)
