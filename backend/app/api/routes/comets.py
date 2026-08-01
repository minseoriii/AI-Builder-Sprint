import uuid

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_authenticated_user_id
from app.db.session import get_db
from app.schemas.comet import (
    CometCompleteRequest,
    CometCompleteResponse,
    CometCreateRequest,
    CometCreateStarResponse,
    CometItem,
    CometListResponse,
    CometSourceType,
    CometStatus,
    CometUpdateRequest,
)
from app.schemas.star_view import ConstellationStarsResponse, StarDetailResponse
from app.services.auth import get_or_create_user_profile
from app.services.comet import (
    cancel_comet,
    complete_comet,
    create_star_from_comet,
    create_user_comet,
    delete_comet,
    get_star_detail,
    list_comets,
    list_constellation_stars,
    update_comet,
)

router = APIRouter(prefix="/comets")


@router.get("", response_model=CometListResponse)
def read_comets(
    status: CometStatus | None = Query(default=None),
    source_type: CometSourceType | None = Query(default=None),
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> CometListResponse:
    get_or_create_user_profile(db, user_id)
    return list_comets(db, user_id, status=status, source_type=source_type)


@router.post("", response_model=CometItem)
def create_comet(
    payload: CometCreateRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> CometItem:
    get_or_create_user_profile(db, user_id)
    return create_user_comet(db, user_id, payload)


@router.put("/{comet_id}", response_model=CometItem)
def update_user_comet(
    comet_id: uuid.UUID,
    payload: CometUpdateRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> CometItem:
    get_or_create_user_profile(db, user_id)
    return update_comet(db, user_id, comet_id, payload)


@router.delete("/{comet_id}", status_code=204, response_class=Response)
def delete_user_comet(
    comet_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> Response:
    get_or_create_user_profile(db, user_id)
    delete_comet(db, user_id, comet_id)
    return Response(status_code=204)


@router.post("/{comet_id}/cancel", response_model=CometItem)
def cancel_user_comet(
    comet_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> CometItem:
    get_or_create_user_profile(db, user_id)
    return cancel_comet(db, user_id, comet_id)


@router.post("/{comet_id}/complete", response_model=CometCompleteResponse)
def complete_user_comet(
    comet_id: uuid.UUID,
    payload: CometCompleteRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> CometCompleteResponse:
    get_or_create_user_profile(db, user_id)
    return complete_comet(db, user_id, comet_id, payload)


@router.post("/{comet_id}/create-star", response_model=CometCreateStarResponse)
def create_star_for_comet(
    comet_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> CometCreateStarResponse:
    get_or_create_user_profile(db, user_id)
    return create_star_from_comet(db, user_id, comet_id)


stars_router = APIRouter()


@stars_router.get("/stars/{star_id}", response_model=StarDetailResponse)
def read_star_detail(
    star_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> StarDetailResponse:
    get_or_create_user_profile(db, user_id)
    return get_star_detail(db, user_id, star_id)


@stars_router.get(
    "/constellations/{category}/stars",
    response_model=ConstellationStarsResponse,
)
def read_constellation_stars(
    category: str,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> ConstellationStarsResponse:
    get_or_create_user_profile(db, user_id)
    return list_constellation_stars(db, user_id, category)
