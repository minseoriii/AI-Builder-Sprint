import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_authenticated_user_id
from app.core.config import settings
from app.core.exceptions import (
    InsufficientRecordsError,
    NorthStarNotFoundError,
    ReportNotFoundError,
)
from app.db.session import get_db
from app.models.alignment_report import AlignmentReport
from app.models.north_star import NorthStar
from app.models.star_entry import StarEntry
from app.schemas.alignment_report import (
    AlignmentReportListResponse,
    AlignmentReportRequest,
    AlignmentReportResponse,
)
from app.services.alignment import build_report_context_for_ai, compute_alignment_statistics
from app.services.alignment_report import (
    generate_alignment_narrative,
    get_alignment_report_prompt_version,
)
from app.services.auth import get_or_create_profile
from app.services.upstage import UpstageClient, get_upstage_client

router = APIRouter(prefix="/reports/alignment")


@router.post("", response_model=AlignmentReportResponse, status_code=201)
def create_alignment_report(
    body: AlignmentReportRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    client: UpstageClient = Depends(get_upstage_client),
) -> AlignmentReport:
    get_or_create_profile(db, user_id)

    north_star = db.query(NorthStar).filter(NorthStar.user_id == user_id).one_or_none()
    if north_star is None:
        raise NorthStarNotFoundError()

    period_end = datetime.now(UTC)
    period_start = period_end - timedelta(days=body.days)

    star_entries = (
        db.query(StarEntry)
        .filter(
            StarEntry.user_id == user_id,
            StarEntry.created_at >= period_start,
            StarEntry.created_at <= period_end,
        )
        .order_by(StarEntry.created_at.desc())
        .all()
    )

    statistics = compute_alignment_statistics(north_star.core_values, star_entries)

    if statistics["total_records"] == 0:
        raise InsufficientRecordsError()

    report_context = build_report_context_for_ai(
        north_star.summary,
        north_star.core_values,
        statistics,
    )
    narrative = generate_alignment_narrative(report_context, client)

    report = AlignmentReport(
        user_id=user_id,
        period_start=period_start,
        period_end=period_end,
        total_records=statistics["total_records"],
        statistics=statistics,
        narrative=narrative.model_dump(),
        model_name=settings.upstage_model,
        prompt_version=get_alignment_report_prompt_version(),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/latest", response_model=AlignmentReportResponse)
def get_latest_alignment_report(
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> AlignmentReport:
    report = (
        db.query(AlignmentReport)
        .filter(AlignmentReport.user_id == user_id)
        .order_by(AlignmentReport.created_at.desc())
        .first()
    )
    if report is None:
        raise ReportNotFoundError()
    return report


@router.get("", response_model=AlignmentReportListResponse)
def list_alignment_reports(
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AlignmentReportListResponse:
    query = (
        db.query(AlignmentReport)
        .filter(AlignmentReport.user_id == user_id)
        .order_by(AlignmentReport.created_at.desc())
    )
    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return AlignmentReportListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{report_id}", response_model=AlignmentReportResponse)
def get_alignment_report(
    report_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> AlignmentReport:
    report = db.get(AlignmentReport, report_id)
    if report is None or report.user_id != user_id:
        raise ReportNotFoundError()
    return report
