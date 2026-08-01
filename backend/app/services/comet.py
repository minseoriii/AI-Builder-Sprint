import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.constants import CONSTELLATION_CATEGORIES, STAR_PREVIEW_MAX_LENGTH
from app.core.exceptions import (
    CometInvalidStateError,
    CometNotFoundError,
    InvalidCategoryError,
    StarNotFoundError,
)
from app.models.comet import Comet
from app.models.daily_record import DailyRecord
from app.models.star import Star
from app.schemas.comet import (
    CometCompleteRequest,
    CometCompleteResponse,
    CometCreateRequest,
    CometCreateStarResponse,
    CometItem,
    CometListResponse,
    CometRecordStatus,
    CometSourceType,
    CometStatus,
    CometUpdateRequest,
)
from app.schemas.daily_record import StarSourceType
from app.schemas.star_view import ConstellationStarsResponse, StarDetailResponse
from app.services.season import today_in_user_timezone


def _truncate_preview(text: str) -> str:
    if len(text) <= STAR_PREVIEW_MAX_LENGTH:
        return text
    return text[:STAR_PREVIEW_MAX_LENGTH]


def _tags_from_record(record: DailyRecord) -> dict[str, list[str]]:
    tags: dict[str, list[str]] = {}
    for tag in record.tags:
        tags.setdefault(tag.dimension, []).append(tag.value)
    return tags


def _content_from_comet(comet: Comet) -> str:
    if comet.activity_summary:
        return comet.activity_summary
    if comet.description:
        return f"{comet.title}\n{comet.description}"
    return comet.title


def _star_for_comet(db: Session, comet_id: uuid.UUID) -> Star | None:
    return (
        db.query(Star)
        .filter(
            Star.source_type == StarSourceType.COMET.value,
            Star.source_id == comet_id,
        )
        .one_or_none()
    )


def _record_status(comet: Comet, star: Star | None) -> CometRecordStatus | None:
    if comet.status != CometStatus.COMPLETED.value:
        return None
    if star is not None:
        return CometRecordStatus.STAR_CREATED
    return CometRecordStatus.RECORDED


def _to_star_detail(db: Session, star: Star) -> StarDetailResponse:
    content = star.preview
    tags: dict[str, list[str]] | None = None

    if star.source_type == StarSourceType.DAILY_RECORD.value:
        record = db.get(DailyRecord, star.source_id)
        if record is not None:
            content = record.original_text
            tags = _tags_from_record(record)
    elif star.source_type == StarSourceType.COMET.value:
        comet = db.get(Comet, star.source_id)
        if comet is not None:
            content = _content_from_comet(comet)

    return StarDetailResponse(
        id=str(star.id),
        source_type=StarSourceType(star.source_type),
        category=star.category,
        recorded_on=star.recorded_on,
        recorded_year=star.recorded_on.year,
        recorded_month=star.recorded_on.month,
        recorded_day=star.recorded_on.day,
        content=content,
        tags=tags,
    )


def _to_item(db: Session, comet: Comet) -> CometItem:
    star = _star_for_comet(db, comet.id)
    return CometItem(
        id=str(comet.id),
        source_type=CometSourceType(comet.source_type),
        target_category=comet.target_category,
        title=comet.title,
        description=comet.description,
        reason=comet.reason,
        status=CometStatus(comet.status),
        created_at=comet.created_at,
        target_completion_date=comet.target_completion_date,
        completed_on=comet.completed_on,
        completed_at=comet.completed_at,
        activity_summary=comet.activity_summary,
        record_status=_record_status(comet, star),
        star_id=str(star.id) if star is not None else None,
    )


def _get_user_comet(db: Session, user_id: uuid.UUID, comet_id: uuid.UUID) -> Comet:
    comet = db.get(Comet, comet_id)
    if comet is None or comet.user_id != user_id:
        raise CometNotFoundError()
    return comet


def list_comets(
    db: Session,
    user_id: uuid.UUID,
    *,
    status: CometStatus | None = None,
    source_type: CometSourceType | None = None,
) -> CometListResponse:
    query = db.query(Comet).filter(Comet.user_id == user_id)
    if status is not None:
        query = query.filter(Comet.status == status.value)
    if source_type is not None:
        query = query.filter(Comet.source_type == source_type.value)
    comets = query.order_by(Comet.created_at.desc()).all()
    return CometListResponse(items=[_to_item(db, comet) for comet in comets])


def create_user_comet(
    db: Session,
    user_id: uuid.UUID,
    payload: CometCreateRequest,
) -> CometItem:
    comet = Comet(
        user_id=user_id,
        source_type=CometSourceType.USER_CREATED.value,
        recommendation_id=None,
        target_category=payload.target_category,
        title=payload.title,
        description=payload.description,
        reason=None,
        target_completion_date=payload.target_completion_date,
        status=CometStatus.PENDING.value,
    )
    db.add(comet)
    db.commit()
    db.refresh(comet)
    return _to_item(db, comet)


def update_comet(
    db: Session,
    user_id: uuid.UUID,
    comet_id: uuid.UUID,
    payload: CometUpdateRequest,
) -> CometItem:
    comet = _get_user_comet(db, user_id, comet_id)
    if comet.status == CometStatus.CANCELLED.value:
        raise CometInvalidStateError("취소된 혜성은 수정할 수 없습니다.")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return _to_item(db, comet)

    if comet.status == CometStatus.PENDING.value:
        if "activity_summary" in updates:
            raise CometInvalidStateError("관측 중 혜성은 활동 요약을 수정할 수 없습니다.")
        for field in ("title", "target_category", "description", "target_completion_date"):
            if field in updates:
                setattr(comet, field, updates[field])
    elif comet.status == CometStatus.COMPLETED.value:
        for field in ("title", "target_category", "activity_summary"):
            if field in updates:
                setattr(comet, field, updates[field])
        if "description" in updates:
            comet.description = updates["description"]
        if "target_completion_date" in updates:
            raise CometInvalidStateError("완료된 혜성의 목표 완료일은 수정할 수 없습니다.")
    else:
        raise CometInvalidStateError()

    db.commit()
    db.refresh(comet)
    return _to_item(db, comet)


def delete_comet(db: Session, user_id: uuid.UUID, comet_id: uuid.UUID) -> None:
    comet = _get_user_comet(db, user_id, comet_id)
    star = _star_for_comet(db, comet.id)
    if star is not None:
        db.delete(star)
    db.delete(comet)
    db.commit()


def cancel_comet(db: Session, user_id: uuid.UUID, comet_id: uuid.UUID) -> CometItem:
    comet = _get_user_comet(db, user_id, comet_id)
    if comet.status == CometStatus.COMPLETED.value:
        raise CometInvalidStateError("완료된 혜성은 취소할 수 없습니다.")
    if comet.status == CometStatus.CANCELLED.value:
        return _to_item(db, comet)
    if comet.status != CometStatus.PENDING.value:
        raise CometInvalidStateError()

    comet.status = CometStatus.CANCELLED.value
    db.commit()
    db.refresh(comet)
    return _to_item(db, comet)


def complete_comet(
    db: Session,
    user_id: uuid.UUID,
    comet_id: uuid.UUID,
    payload: CometCompleteRequest,
) -> CometCompleteResponse:
    comet = _get_user_comet(db, user_id, comet_id)

    if comet.status == CometStatus.COMPLETED.value:
        return CometCompleteResponse(
            comet_id=str(comet.id),
            completed_on=comet.completed_on or today_in_user_timezone(),
            activity_summary=comet.activity_summary or payload.activity_summary,
            record_status=_record_status(comet, _star_for_comet(db, comet.id))
            or CometRecordStatus.RECORDED,
        )

    if comet.status == CometStatus.CANCELLED.value:
        raise CometInvalidStateError("취소된 혜성은 완료할 수 없습니다.")
    if comet.status != CometStatus.PENDING.value:
        raise CometInvalidStateError()

    completed_on = payload.completed_on or today_in_user_timezone()
    comet.status = CometStatus.COMPLETED.value
    comet.completed_on = completed_on
    comet.completed_at = datetime.now(UTC)
    comet.activity_summary = payload.activity_summary
    db.commit()
    db.refresh(comet)

    return CometCompleteResponse(
        comet_id=str(comet.id),
        completed_on=completed_on,
        activity_summary=comet.activity_summary,
        record_status=CometRecordStatus.RECORDED,
    )


def create_star_from_comet(
    db: Session,
    user_id: uuid.UUID,
    comet_id: uuid.UUID,
) -> CometCreateStarResponse:
    comet = _get_user_comet(db, user_id, comet_id)
    if comet.status != CometStatus.COMPLETED.value:
        raise CometInvalidStateError("관측 완료된 혜성만 별을 생성할 수 있습니다.")

    existing_star = _star_for_comet(db, comet.id)
    if existing_star is not None:
        return CometCreateStarResponse(
            comet_id=str(comet.id),
            star_id=str(existing_star.id),
            category=existing_star.category,
            recorded_on=existing_star.recorded_on,
            record_status=CometRecordStatus.STAR_CREATED,
        )

    recorded_on = comet.completed_on or today_in_user_timezone()
    preview_source = comet.activity_summary or comet.title

    try:
        star = Star(
            user_id=user_id,
            source_type=StarSourceType.COMET.value,
            source_id=comet.id,
            category=comet.target_category,
            recorded_on=recorded_on,
            preview=_truncate_preview(preview_source),
        )
        db.add(star)
        db.commit()
        db.refresh(star)
    except Exception:
        db.rollback()
        existing_star = _star_for_comet(db, comet.id)
        if existing_star is not None:
            return CometCreateStarResponse(
                comet_id=str(comet.id),
                star_id=str(existing_star.id),
                category=existing_star.category,
                recorded_on=existing_star.recorded_on,
                record_status=CometRecordStatus.STAR_CREATED,
            )
        raise

    return CometCreateStarResponse(
        comet_id=str(comet.id),
        star_id=str(star.id),
        category=star.category,
        recorded_on=star.recorded_on,
        record_status=CometRecordStatus.STAR_CREATED,
    )


def get_star_detail(
    db: Session,
    user_id: uuid.UUID,
    star_id: uuid.UUID,
) -> StarDetailResponse:
    star = db.get(Star, star_id)
    if star is None or star.user_id != user_id:
        raise StarNotFoundError()
    return _to_star_detail(db, star)


def list_constellation_stars(
    db: Session,
    user_id: uuid.UUID,
    category: str,
) -> ConstellationStarsResponse:
    if category not in CONSTELLATION_CATEGORIES:
        raise InvalidCategoryError()

    stars = (
        db.query(Star)
        .filter(Star.user_id == user_id, Star.category == category)
        .order_by(Star.recorded_on.desc(), Star.created_at.desc())
        .all()
    )
    return ConstellationStarsResponse(
        category=category,
        stars=[_to_star_detail(db, star) for star in stars],
    )
