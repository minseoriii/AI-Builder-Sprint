import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_authenticated_user_id
from app.db.session import get_db
from app.schemas.comet import (
    CometItem,
    CometRecommendationGenerateResponse,
    CometRecommendationItem,
    CometRecommendationResponse,
)
from app.services.auth import get_or_create_user_profile
from app.services.comet import _to_item
from app.services.comet_recommendation import (
    accept_recommendation,
    generate_recommendation,
    get_current_recommendation,
    reject_recommendation,
)
from app.services.upstage import UpstageClient, get_upstage_client

router = APIRouter(prefix="/comet-recommendations")


@router.get("/current", response_model=CometRecommendationResponse)
def read_current_recommendation(
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> CometRecommendationResponse:
    get_or_create_user_profile(db, user_id)
    return get_current_recommendation(db, user_id)


@router.post("/generate", response_model=CometRecommendationGenerateResponse)
def create_recommendation(
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    client: UpstageClient = Depends(get_upstage_client),
) -> CometRecommendationGenerateResponse:
    get_or_create_user_profile(db, user_id)
    return generate_recommendation(db, user_id, client)


@router.post("/{recommendation_id}/accept", response_model=CometItem)
def accept_comet_recommendation(
    recommendation_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> CometItem:
    get_or_create_user_profile(db, user_id)
    comet = accept_recommendation(db, user_id, recommendation_id)
    return _to_item(db, comet)


@router.post("/{recommendation_id}/reject", response_model=CometRecommendationItem)
def reject_comet_recommendation(
    recommendation_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> CometRecommendationItem:
    get_or_create_user_profile(db, user_id)
    return reject_recommendation(db, user_id, recommendation_id)
