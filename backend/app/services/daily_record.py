import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.constants import QUESTION_PRESETS, STAR_PREVIEW_MAX_LENGTH
from app.core.exceptions import (
    AnalysisAlreadyUsedError,
    AnalysisExpiredError,
    AnalysisNotFoundError,
    AnalysisNotReadyError,
    DailyRecordNotFoundError,
    InvalidTagsError,
)
from app.models.daily_record import DailyRecord
from app.models.daily_record_analysis import DailyRecordAnalysis
from app.models.daily_record_tag import DailyRecordTag
from app.models.star import Star
from app.schemas.daily_record import (
    CategoryRankingResponse,
    DailyRecordAnalysisStatus,
    DailyRecordAnalyzeResponse,
    DailyRecordConfirmResponse,
    DailyRecordDetailsResponse,
    DailyRecordResponse,
    MissingQuestion,
    StarSourceType,
    TagSource,
    validate_tags_snapshot,
)
from app.services.auth import get_or_create_user_profile
from app.services.daily_record_classification import (
    classify_daily_record,
    get_daily_record_classification_prompt_version,
)
from app.services.daily_record_extraction import (
    analyze_daily_record_extraction,
    get_daily_record_extraction_prompt_version,
)
from app.services.upstage import UpstageClient


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _get_open_analysis(
    db: Session,
    user_id: uuid.UUID,
    analysis_id: uuid.UUID,
) -> DailyRecordAnalysis:
    analysis = db.get(DailyRecordAnalysis, analysis_id)
    if analysis is None or analysis.user_id != user_id:
        raise AnalysisNotFoundError()
    if analysis.status == DailyRecordAnalysisStatus.CONFIRMED.value:
        raise AnalysisAlreadyUsedError()
    if _as_utc(analysis.expires_at) < datetime.now(UTC):
        raise AnalysisExpiredError()
    return analysis


def _build_missing_questions(missing_dimensions: list[str]) -> list[MissingQuestion]:
    return [
        MissingQuestion(
            dimension=dimension,
            question=QUESTION_PRESETS[dimension],
        )
        for dimension in missing_dimensions
    ]


def _determine_status(missing_dimensions: list[str]) -> DailyRecordAnalysisStatus:
    if missing_dimensions:
        return DailyRecordAnalysisStatus.NEEDS_INPUT
    return DailyRecordAnalysisStatus.READY_FOR_REVIEW


def _ranking_to_response(ranking: list) -> list[CategoryRankingResponse]:
    return [
        CategoryRankingResponse(
            category=item["category"],
            score=item["score"],
            reason=item["reason"],
        )
        for item in ranking
    ]


def _truncate_preview(text: str) -> str:
    if len(text) <= STAR_PREVIEW_MAX_LENGTH:
        return text
    return text[:STAR_PREVIEW_MAX_LENGTH]


def _resolve_tag_source(
    dimension: str,
    value: str,
    ai_tags: dict[str, list[str]],
) -> str:
    ai_values = ai_tags.get(dimension, [])
    return TagSource.AI.value if value in ai_values else TagSource.USER.value


def create_daily_record_analysis(
    db: Session,
    user_id: uuid.UUID,
    text: str,
    recorded_on: date,
    client: UpstageClient,
) -> DailyRecordAnalyzeResponse:
    get_or_create_user_profile(db, user_id)
    ai_result, tags, missing = analyze_daily_record_extraction(text, client)

    now = datetime.now(UTC)
    status = _determine_status(missing)
    ai_extracted = {
        dimension: ai_result.dimensions[dimension].model_dump()
        for dimension in ai_result.dimensions
    }

    analysis = DailyRecordAnalysis(
        user_id=user_id,
        original_text=text,
        recorded_on=recorded_on,
        status=status.value,
        ai_extracted_tags=ai_extracted,
        final_tags=tags,
        model_name=settings.upstage_model,
        prompt_version=get_daily_record_extraction_prompt_version(),
        expires_at=now + timedelta(hours=settings.daily_record_analysis_ttl_hours),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return DailyRecordAnalyzeResponse(
        analysis_id=str(analysis.id),
        status=status,
        original_text=text,
        tags=tags,
        missing_questions=_build_missing_questions(missing),
    )


def update_daily_record_details(
    db: Session,
    user_id: uuid.UUID,
    analysis_id: uuid.UUID,
    tags: dict[str, list[str]],
    client: UpstageClient,
) -> DailyRecordDetailsResponse:
    analysis = _get_open_analysis(db, user_id, analysis_id)

    try:
        normalized_tags = validate_tags_snapshot(tags)
    except ValueError as exc:
        raise InvalidTagsError(str(exc)) from exc

    classification = classify_daily_record(
        analysis.original_text,
        normalized_tags,
        client,
    )

    ranking = [item.model_dump() for item in classification.category_ranking]
    analysis.final_tags = normalized_tags
    analysis.category_ranking = ranking
    analysis.ai_primary_category = classification.primary_category
    analysis.status = DailyRecordAnalysisStatus.READY_FOR_CONFIRMATION.value
    analysis.prompt_version = get_daily_record_classification_prompt_version()
    db.commit()
    db.refresh(analysis)

    return DailyRecordDetailsResponse(
        analysis_id=str(analysis.id),
        status=DailyRecordAnalysisStatus.READY_FOR_CONFIRMATION,
        original_text=analysis.original_text,
        recorded_on=analysis.recorded_on,
        tags=normalized_tags,
        primary_category=classification.primary_category,
        category_ranking=_ranking_to_response(ranking),
    )


def confirm_daily_record(
    db: Session,
    user_id: uuid.UUID,
    analysis_id: uuid.UUID,
    primary_category: str,
) -> DailyRecordConfirmResponse:
    analysis = db.get(DailyRecordAnalysis, analysis_id)
    if analysis is None or analysis.user_id != user_id:
        raise AnalysisNotFoundError()

    if analysis.status == DailyRecordAnalysisStatus.CONFIRMED.value:
        if analysis.daily_record_id is None:
            raise AnalysisAlreadyUsedError()
        star = (
            db.query(Star)
            .filter(
                Star.source_type == StarSourceType.DAILY_RECORD.value,
                Star.source_id == analysis.daily_record_id,
            )
            .one_or_none()
        )
        if star is None:
            raise AnalysisAlreadyUsedError()
        record = db.get(DailyRecord, analysis.daily_record_id)
        if record is None:
            raise AnalysisAlreadyUsedError()
        return DailyRecordConfirmResponse(
            daily_record_id=str(record.id),
            star_id=str(star.id),
            primary_category=record.primary_category,
            recorded_on=record.recorded_on,
        )

    if _as_utc(analysis.expires_at) < datetime.now(UTC):
        raise AnalysisExpiredError()

    if analysis.status != DailyRecordAnalysisStatus.READY_FOR_CONFIRMATION.value:
        raise AnalysisNotReadyError()

    if analysis.final_tags is None or analysis.ai_primary_category is None:
        raise AnalysisNotReadyError()

    ai_primary = analysis.ai_primary_category
    category_overridden = primary_category != ai_primary
    ranking = analysis.category_ranking or []

    try:
        daily_record = DailyRecord(
            user_id=user_id,
            original_text=analysis.original_text,
            recorded_on=analysis.recorded_on,
            primary_category=primary_category,
            ai_primary_category=ai_primary,
            category_overridden=category_overridden,
            category_ranking=ranking,
            source_type=StarSourceType.DAILY_RECORD.value,
            analysis_id=analysis.id,
        )
        db.add(daily_record)
        db.flush()

        ai_tag_snapshot = {
            dimension: data.get("values", [])
            for dimension, data in analysis.ai_extracted_tags.items()
        }
        for dimension, values in analysis.final_tags.items():
            for index, value in enumerate(values):
                db.add(
                    DailyRecordTag(
                        daily_record_id=daily_record.id,
                        dimension=dimension,
                        value=value,
                        source=_resolve_tag_source(dimension, value, ai_tag_snapshot),
                        sort_order=index,
                    )
                )

        star = Star(
            user_id=user_id,
            source_type=StarSourceType.DAILY_RECORD.value,
            source_id=daily_record.id,
            category=primary_category,
            recorded_on=analysis.recorded_on,
            preview=_truncate_preview(analysis.original_text),
        )
        db.add(star)

        analysis.status = DailyRecordAnalysisStatus.CONFIRMED.value
        analysis.confirmed_at = datetime.now(UTC)
        analysis.daily_record_id = daily_record.id
        db.commit()
        db.refresh(daily_record)
        db.refresh(star)
    except Exception:
        db.rollback()
        raise

    return DailyRecordConfirmResponse(
        daily_record_id=str(daily_record.id),
        star_id=str(star.id),
        primary_category=daily_record.primary_category,
        recorded_on=daily_record.recorded_on,
    )


def get_daily_record(
    db: Session,
    user_id: uuid.UUID,
    daily_record_id: uuid.UUID,
) -> DailyRecordResponse:
    record = db.get(DailyRecord, daily_record_id)
    if record is None or record.user_id != user_id:
        raise DailyRecordNotFoundError()

    tags: dict[str, list[str]] = {}
    for tag in record.tags:
        tags.setdefault(tag.dimension, []).append(tag.value)

    return DailyRecordResponse(
        id=str(record.id),
        original_text=record.original_text,
        recorded_on=record.recorded_on,
        tags=tags,
        primary_category=record.primary_category,
        category_ranking=_ranking_to_response(record.category_ranking),
        category_overridden=record.category_overridden,
        created_at=record.created_at.isoformat(),
    )
