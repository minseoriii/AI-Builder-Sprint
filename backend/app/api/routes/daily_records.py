import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_authenticated_user_id
from app.db.session import get_db
from app.schemas.daily_record import (
    DailyRecordAnalyzeRequest,
    DailyRecordAnalyzeResponse,
    DailyRecordConfirmRequest,
    DailyRecordConfirmResponse,
    DailyRecordDetailsRequest,
    DailyRecordDetailsResponse,
    DailyRecordResponse,
)
from app.services.auth import get_or_create_user_profile
from app.services.daily_record import (
    confirm_daily_record,
    create_daily_record_analysis,
    get_daily_record,
    update_daily_record_details,
)
from app.services.upstage import UpstageClient, get_upstage_client

router = APIRouter(prefix="/daily-records", tags=["daily-records"])


@router.post("/analyze", response_model=DailyRecordAnalyzeResponse)
def analyze_daily_record(
    body: DailyRecordAnalyzeRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    client: UpstageClient = Depends(get_upstage_client),
) -> DailyRecordAnalyzeResponse:
    get_or_create_user_profile(db, user_id)
    return create_daily_record_analysis(
        db, user_id, body.text, body.recorded_on, client
    )


@router.put(
    "/analyses/{analysis_id}/details",
    response_model=DailyRecordDetailsResponse,
)
def update_analysis_details(
    analysis_id: uuid.UUID,
    body: DailyRecordDetailsRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    client: UpstageClient = Depends(get_upstage_client),
) -> DailyRecordDetailsResponse:
    get_or_create_user_profile(db, user_id)
    return update_daily_record_details(
        db, user_id, analysis_id, body.tags, client
    )


@router.post(
    "/analyses/{analysis_id}/confirm",
    response_model=DailyRecordConfirmResponse,
)
def confirm_analysis(
    analysis_id: uuid.UUID,
    body: DailyRecordConfirmRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> DailyRecordConfirmResponse:
    get_or_create_user_profile(db, user_id)
    return confirm_daily_record(db, user_id, analysis_id, body.primary_category)


@router.get("/{daily_record_id}", response_model=DailyRecordResponse)
def read_daily_record(
    daily_record_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> DailyRecordResponse:
    get_or_create_user_profile(db, user_id)
    return get_daily_record(db, user_id, daily_record_id)
