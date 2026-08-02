import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import InvalidSeasonError
from app.models.galaxy_overview_summary import GalaxyOverviewSummary
from app.schemas.galaxy import (
    CategoryCount,
    ConstellationStat,
    GalaxyOverviewResponse,
    GalaxySummaryLines,
    Season,
    season_label,
    validate_season_value,
)
from app.services.galaxy_overview_summary_ai import (
    generate_galaxy_overview_summary,
    get_galaxy_overview_summary_prompt_version,
)
from app.services.galaxy_statistics import (
    allowed_categories_from_stats,
    build_overview_fingerprint,
    build_overview_summary_payload,
    compute_overview_statistics,
)
from app.services.season import (
    get_current_season_and_year,
    get_effective_end_date,
    get_season_date_range,
)
from app.services.upstage import UpstageClient


def get_galaxy_overview(
    db: Session,
    user_id: uuid.UUID,
    client: UpstageClient,
    *,
    year: int | None = None,
    season: Season | None = None,
) -> GalaxyOverviewResponse:
    if season is None or year is None:
        default_year, default_season = get_current_season_and_year()
        year = year or default_year
        season = season or default_season

    period_start, period_end = get_season_date_range(year, season)
    effective_end = get_effective_end_date(period_start, period_end)

    stats = compute_overview_statistics(
        db,
        user_id,
        year=year,
        season=season,
        period_start=period_start,
        period_end=period_end,
        effective_end=effective_end,
    )

    fingerprint = build_overview_fingerprint(stats)
    cached = (
        db.query(GalaxyOverviewSummary)
        .filter(
            GalaxyOverviewSummary.user_id == user_id,
            GalaxyOverviewSummary.year == year,
            GalaxyOverviewSummary.season == season.value,
        )
        .one_or_none()
    )

    if cached is not None and cached.fingerprint == fingerprint:
        lines = cached.lines
    else:
        payload = build_overview_summary_payload(stats)
        allowed = allowed_categories_from_stats(stats)
        ai_result = generate_galaxy_overview_summary(payload, allowed, client)
        lines = ai_result.lines

        north_star_updated_at = None
        if stats.get("north_star_updated_at"):
            north_star_updated_at = datetime.fromisoformat(stats["north_star_updated_at"])

        latest_star_created_at = None
        if stats.get("latest_star_created_at"):
            latest_star_created_at = datetime.fromisoformat(
                stats["latest_star_created_at"]
            )

        if cached is None:
            cached = GalaxyOverviewSummary(
                user_id=user_id,
                year=year,
                season=season.value,
                fingerprint=fingerprint,
                lines=lines,
                model_name=settings.upstage_model,
                prompt_version=get_galaxy_overview_summary_prompt_version(),
                north_star_updated_at=north_star_updated_at,
                total_star_count=stats["total_star_count"],
                latest_star_created_at=latest_star_created_at,
            )
            db.add(cached)
        else:
            cached.fingerprint = fingerprint
            cached.lines = lines
            cached.model_name = settings.upstage_model
            cached.prompt_version = get_galaxy_overview_summary_prompt_version()
            cached.north_star_updated_at = north_star_updated_at
            cached.total_star_count = stats["total_star_count"]
            cached.latest_star_created_at = latest_star_created_at
        db.commit()

    constellations = [
        ConstellationStat.model_validate(item) for item in stats["constellations"]
    ]
    largest = (
        CategoryCount.model_validate(stats["largest_category"])
        if stats["largest_category"]
        else None
    )
    smallest = (
        CategoryCount.model_validate(stats["smallest_selected_category"])
        if stats["smallest_selected_category"]
        else None
    )

    return GalaxyOverviewResponse(
        year=year,
        season=season,
        season_label=season_label(season),
        north_star_text=stats["north_star_text"],
        total_star_count=stats["total_star_count"],
        observed_constellation_count=stats["observed_constellation_count"],
        active_constellation_count=stats["active_constellation_count"],
        observation_days=stats["observation_days"],
        unselected_category_star_count=stats["unselected_category_star_count"],
        constellations=constellations,
        largest_category=largest,
        smallest_selected_category=smallest,
        unobserved_selected_categories=stats["unobserved_selected_categories"],
        summary=GalaxySummaryLines(lines=lines),
    )


def parse_overview_query_season(value: str | None) -> Season | None:
    if value is None:
        return None
    try:
        return validate_season_value(value)
    except ValueError as exc:
        raise InvalidSeasonError(str(exc)) from exc
