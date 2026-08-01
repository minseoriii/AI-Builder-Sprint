import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_authenticated_user_id
from app.db.session import get_db
from app.schemas.galaxy import (
    GalaxyOverviewResponse,
    GalaxyReportDetailResponse,
    GalaxyReportListResponse,
    GalaxyReportReflectionRequest,
)
from app.services.auth import get_or_create_user_profile
from app.services.galaxy_overview import get_galaxy_overview, parse_overview_query_season
from app.services.seasonal_galaxy_report import (
    generate_report,
    get_report_detail,
    list_reports,
    parse_season_param,
    save_reflection,
)
from app.services.upstage import UpstageClient, get_upstage_client

router = APIRouter(prefix="/galaxy")


@router.get("/overview", response_model=GalaxyOverviewResponse)
def read_galaxy_overview(
    year: int | None = Query(default=None),
    season: str | None = Query(default=None),
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    client: UpstageClient = Depends(get_upstage_client),
) -> GalaxyOverviewResponse:
    get_or_create_user_profile(db, user_id)
    parsed_season = parse_overview_query_season(season)
    return get_galaxy_overview(
        db,
        user_id,
        client,
        year=year,
        season=parsed_season,
    )


@router.post("/reports/{year}/{season}/generate", response_model=GalaxyReportDetailResponse)
def create_season_report(
    year: int,
    season: str,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    client: UpstageClient = Depends(get_upstage_client),
) -> GalaxyReportDetailResponse:
    get_or_create_user_profile(db, user_id)
    parsed_season = parse_season_param(season)
    return generate_report(db, user_id, year, parsed_season, client)


@router.get("/reports", response_model=GalaxyReportListResponse)
def read_season_reports(
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> GalaxyReportListResponse:
    get_or_create_user_profile(db, user_id)
    return list_reports(db, user_id)


@router.get("/reports/{report_id}", response_model=GalaxyReportDetailResponse)
def read_season_report_detail(
    report_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> GalaxyReportDetailResponse:
    get_or_create_user_profile(db, user_id)
    return get_report_detail(db, user_id, report_id)


@router.put("/reports/{report_id}/reflection", response_model=GalaxyReportDetailResponse)
def update_report_reflection(
    report_id: uuid.UUID,
    payload: GalaxyReportReflectionRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> GalaxyReportDetailResponse:
    get_or_create_user_profile(db, user_id)
    return save_reflection(db, user_id, report_id, payload)
