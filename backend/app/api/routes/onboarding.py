import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_authenticated_user_id
from app.db.session import get_db
from app.schemas.onboarding import (
    NorthStarAnalyzeRequest,
    NorthStarAnalyzeResponse,
    NorthStarSaveRequest,
    OnboardingStatusResponse,
)
from app.services.auth import get_or_create_user_profile
from app.services.onboarding import (
    create_north_star_analysis,
    get_onboarding_status,
    save_north_star_selection,
)
from app.services.upstage import UpstageClient, get_upstage_client

router = APIRouter()


@router.get("/me/onboarding", response_model=OnboardingStatusResponse)
def get_my_onboarding_status(
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> OnboardingStatusResponse:
    return get_onboarding_status(db, user_id)


@router.post(
    "/onboarding/north-star/analyze",
    response_model=NorthStarAnalyzeResponse,
)
def analyze_north_star(
    body: NorthStarAnalyzeRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    client: UpstageClient = Depends(get_upstage_client),
) -> NorthStarAnalyzeResponse:
    get_or_create_user_profile(db, user_id)
    return create_north_star_analysis(db, user_id, body.text, client)


@router.put("/onboarding/north-star", response_model=OnboardingStatusResponse)
def save_north_star(
    body: NorthStarSaveRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> OnboardingStatusResponse:
    get_or_create_user_profile(db, user_id)
    return save_north_star_selection(
        db,
        user_id,
        uuid.UUID(body.analysis_id),
        body.selected_categories,
    )
