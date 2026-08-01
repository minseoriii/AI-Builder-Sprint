import uuid
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    FutureSeasonError,
    GalaxyReportNotFoundError,
    InvalidSeasonError,
)
from app.models.seasonal_galaxy_report import SeasonalGalaxyReport
from app.schemas.galaxy import (
    GalaxyReportDetailResponse,
    GalaxyReportListItem,
    GalaxyReportListResponse,
    GalaxyReportReflectionRequest,
    Season,
    season_label,
    validate_season_value,
)
from app.services.galaxy_statistics import (
    allowed_categories_from_stats,
    build_reflection_question,
    compute_season_report_statistics,
)
from app.services.season import (
    get_effective_end_date,
    get_season_date_range,
    is_future_season,
)
from app.services.seasonal_galaxy_report_ai import (
    generate_seasonal_galaxy_report_analysis,
    get_seasonal_galaxy_report_prompt_version,
)
from app.services.upstage import UpstageClient


def _get_user_report(
    db: Session, user_id: uuid.UUID, report_id: uuid.UUID
) -> SeasonalGalaxyReport:
    report = db.get(SeasonalGalaxyReport, report_id)
    if report is None or report.user_id != user_id:
        raise GalaxyReportNotFoundError()
    return report


def list_reports(db: Session, user_id: uuid.UUID) -> GalaxyReportListResponse:
    reports = (
        db.query(SeasonalGalaxyReport)
        .filter(SeasonalGalaxyReport.user_id == user_id)
        .order_by(
            SeasonalGalaxyReport.year.desc(),
            SeasonalGalaxyReport.created_at.desc(),
        )
        .all()
    )
    items: list[GalaxyReportListItem] = []
    for report in reports:
        total_star_count = report.statistics_snapshot.get("total_star_count", 0)
        items.append(
            GalaxyReportListItem(
                id=str(report.id),
                year=report.year,
                season=Season(report.season),
                season_label=season_label(report.season),
                generated_through=report.generated_through,
                total_star_count=total_star_count,
                created_at=report.created_at.isoformat(),
            )
        )
    return GalaxyReportListResponse(items=items)


def get_report_detail(
    db: Session, user_id: uuid.UUID, report_id: uuid.UUID
) -> GalaxyReportDetailResponse:
    report = _get_user_report(db, user_id, report_id)
    reflection_question = build_reflection_question(
        report.statistics_snapshot,
        season_label(report.season),
    )
    return GalaxyReportDetailResponse(
        id=str(report.id),
        year=report.year,
        season=Season(report.season),
        season_label=season_label(report.season),
        season_start=report.season_start,
        season_end=report.season_end,
        generated_through=report.generated_through,
        created_at=report.created_at.isoformat(),
        north_star_snapshot=report.north_star_snapshot,
        statistics_snapshot=report.statistics_snapshot,
        ai_analysis=report.ai_analysis,
        reflection_question=reflection_question,
        reflection=report.reflection,
        reflection_updated_at=(
            report.reflection_updated_at.isoformat()
            if report.reflection_updated_at
            else None
        ),
    )


def generate_report(
    db: Session,
    user_id: uuid.UUID,
    year: int,
    season: Season,
    client: UpstageClient,
) -> GalaxyReportDetailResponse:
    if is_future_season(year, season):
        raise FutureSeasonError()

    existing = (
        db.query(SeasonalGalaxyReport)
        .filter(
            SeasonalGalaxyReport.user_id == user_id,
            SeasonalGalaxyReport.year == year,
            SeasonalGalaxyReport.season == season.value,
        )
        .one_or_none()
    )
    if existing is not None:
        return get_report_detail(db, user_id, existing.id)

    period_start, period_end = get_season_date_range(year, season)
    effective_end = get_effective_end_date(period_start, period_end)

    stats = compute_season_report_statistics(
        db,
        user_id,
        year=year,
        season=season,
        period_start=period_start,
        period_end=period_end,
        effective_end=effective_end,
    )

    allowed = allowed_categories_from_stats(
        {
            "selected_categories": stats["selected_categories"],
            "largest_category": stats["largest_category"],
            "smallest_selected_category": stats["smallest_selected_category"],
            "unobserved_selected_categories": stats["unobserved_selected_categories"],
            "constellations": stats["selected_distribution"],
        }
    )
    ai_result = generate_seasonal_galaxy_report_analysis(stats, allowed, client)

    try:
        report = SeasonalGalaxyReport(
            user_id=user_id,
            year=year,
            season=season.value,
            season_start=period_start,
            season_end=period_end,
            generated_through=effective_end,
            north_star_snapshot=stats["north_star_snapshot"],
            statistics_snapshot=stats,
            ai_analysis=ai_result.model_dump(),
            model_name=settings.upstage_model,
            prompt_version=get_seasonal_galaxy_report_prompt_version(),
        )
        db.add(report)
        db.commit()
        db.refresh(report)
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(SeasonalGalaxyReport)
            .filter(
                SeasonalGalaxyReport.user_id == user_id,
                SeasonalGalaxyReport.year == year,
                SeasonalGalaxyReport.season == season.value,
            )
            .one_or_none()
        )
        if existing is None:
            raise
        return get_report_detail(db, user_id, existing.id)
    except Exception:
        db.rollback()
        raise

    return get_report_detail(db, user_id, report.id)


def save_reflection(
    db: Session,
    user_id: uuid.UUID,
    report_id: uuid.UUID,
    payload: GalaxyReportReflectionRequest,
) -> GalaxyReportDetailResponse:
    report = _get_user_report(db, user_id, report_id)
    report.reflection = payload.reflection
    report.reflection_updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(report)
    return get_report_detail(db, user_id, report.id)


def parse_season_param(value: str) -> Season:
    try:
        return validate_season_value(value)
    except ValueError as exc:
        raise InvalidSeasonError(str(exc)) from exc
