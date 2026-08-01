import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_authenticated_user_id
from app.core.config import settings
from app.core.exceptions import NorthStarNotFoundError, StarNotFoundError
from app.db.session import get_db
from app.models.north_star import NorthStar
from app.models.star_entry import StarEntry
from app.schemas.star_entry import StarCreateRequest, StarEntryResponse, StarListResponse
from app.services.auth import get_or_create_profile
from app.services.star_analysis import analyze_star_entry, get_star_entry_prompt_version
from app.services.upstage import UpstageClient, get_upstage_client

router = APIRouter(prefix="/stars")


@router.post("", response_model=StarEntryResponse, status_code=201)
def create_star(
    body: StarCreateRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    client: UpstageClient = Depends(get_upstage_client),
) -> StarEntry:
    get_or_create_profile(db, user_id)

    north_star = db.query(NorthStar).filter(NorthStar.user_id == user_id).one_or_none()
    if north_star is None:
        raise NorthStarNotFoundError()

    ai_result = analyze_star_entry(
        body.content,
        north_star.core_values,
        client,
    )

    star = StarEntry(
        user_id=user_id,
        content=body.content,
        companion_type=body.companion_type,
        life_domains=ai_result.life_domains,
        related_values=[rv.model_dump() for rv in ai_result.related_values],
        sensory_tags=ai_result.sensory_tags,
        analysis_confidence=ai_result.confidence,
        model_name=settings.upstage_model,
        prompt_version=get_star_entry_prompt_version(),
    )
    db.add(star)
    db.commit()
    db.refresh(star)
    return star


@router.get("", response_model=StarListResponse)
def list_stars(
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> StarListResponse:
    query = (
        db.query(StarEntry)
        .filter(StarEntry.user_id == user_id)
        .order_by(StarEntry.created_at.desc())
    )
    total = query.count()
    items = query.offset(offset).limit(limit).all()
    return StarListResponse(items=items, total=total, limit=limit, offset=offset)


@router.get("/{star_id}", response_model=StarEntryResponse)
def get_star(
    star_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> StarEntry:
    star = db.get(StarEntry, star_id)
    if star is None or star.user_id != user_id:
        raise StarNotFoundError()
    return star


@router.delete("/{star_id}", status_code=204)
def delete_star(
    star_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> None:
    star = db.get(StarEntry, star_id)
    if star is None or star.user_id != user_id:
        raise StarNotFoundError()
    db.delete(star)
    db.commit()
