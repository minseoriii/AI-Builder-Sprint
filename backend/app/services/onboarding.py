import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    AnalysisAlreadyUsedError,
    AnalysisExpiredError,
    AnalysisNotFoundError,
    InvalidSelectionError,
)
from app.models.north_star import NorthStar
from app.models.north_star_analysis import NorthStarAnalysis
from app.models.selected_constellation import SelectedConstellation
from app.schemas.onboarding import (
    ConstellationCandidateResponse,
    NorthStarAnalyzeResponse,
    NorthStarSummary,
    OnboardingStatusResponse,
)
from app.services.auth import get_or_create_user_profile
from app.services.north_star_analysis import (
    analyze_north_star_constellations,
    get_north_star_analysis_prompt_version,
)
from app.services.upstage import UpstageClient


def get_onboarding_status(db: Session, user_id: uuid.UUID) -> OnboardingStatusResponse:
    profile = get_or_create_user_profile(db, user_id)
    if not profile.onboarding_completed:
        return OnboardingStatusResponse(onboarding_completed=False, north_star=None)

    north_star = (
        db.query(NorthStar)
        .filter(NorthStar.user_id == user_id, NorthStar.is_active.is_(True))
        .one_or_none()
    )
    if north_star is None:
        return OnboardingStatusResponse(onboarding_completed=False, north_star=None)

    categories = [item.category for item in north_star.selected_constellations]
    return OnboardingStatusResponse(
        onboarding_completed=True,
        north_star=NorthStarSummary(
            text=north_star.original_text,
            selected_categories=categories,
        ),
    )


def create_north_star_analysis(
    db: Session,
    user_id: uuid.UUID,
    text: str,
    client: UpstageClient,
) -> NorthStarAnalyzeResponse:
    get_or_create_user_profile(db, user_id)
    ai_result = analyze_north_star_constellations(text, client)

    now = datetime.now(UTC)
    analysis = NorthStarAnalysis(
        user_id=user_id,
        original_text=text,
        model_name=settings.upstage_model,
        prompt_version=get_north_star_analysis_prompt_version(),
        candidates=[item.model_dump() for item in ai_result.candidates],
        expires_at=now + timedelta(hours=settings.north_star_analysis_ttl_hours),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return NorthStarAnalyzeResponse(
        analysis_id=str(analysis.id),
        candidates=[
            ConstellationCandidateResponse.model_validate(item.model_dump())
            for item in ai_result.candidates
        ],
    )


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _get_valid_analysis(
    db: Session,
    user_id: uuid.UUID,
    analysis_id: uuid.UUID,
) -> NorthStarAnalysis:
    analysis = db.get(NorthStarAnalysis, analysis_id)
    if analysis is None or analysis.user_id != user_id:
        raise AnalysisNotFoundError()
    if analysis.is_used:
        raise AnalysisAlreadyUsedError()
    if _as_utc(analysis.expires_at) < datetime.now(UTC):
        raise AnalysisExpiredError()
    return analysis


def save_north_star_selection(
    db: Session,
    user_id: uuid.UUID,
    analysis_id: uuid.UUID,
    selected_categories: list[str],
) -> OnboardingStatusResponse:
    analysis = _get_valid_analysis(db, user_id, analysis_id)
    candidate_map = {item["category"]: item for item in analysis.candidates}

    for category in selected_categories:
        if category not in candidate_map:
            raise InvalidSelectionError(
                f"분석 후보에 없는 성단은 선택할 수 없습니다: {category}"
            )

    profile = get_or_create_user_profile(db, user_id)

    try:
        north_star = (
            db.query(NorthStar)
            .filter(NorthStar.user_id == user_id)
            .one_or_none()
        )
        if north_star is None:
            north_star = NorthStar(
                user_id=user_id,
                original_text=analysis.original_text,
                is_active=True,
            )
            db.add(north_star)
            db.flush()
        else:
            north_star.original_text = analysis.original_text
            north_star.is_active = True
            db.query(SelectedConstellation).filter(
                SelectedConstellation.north_star_id == north_star.id
            ).delete()

        for index, category in enumerate(selected_categories):
            candidate = candidate_map[category]
            db.add(
                SelectedConstellation(
                    north_star_id=north_star.id,
                    category=category,
                    sort_order=index,
                    ai_recommended=candidate["recommended"],
                    ai_score=candidate["score"],
                )
            )

        analysis.is_used = True
        profile.onboarding_completed = True
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(north_star)
    return OnboardingStatusResponse(
        onboarding_completed=True,
        north_star=NorthStarSummary(
            text=north_star.original_text,
            selected_categories=selected_categories,
        ),
    )
