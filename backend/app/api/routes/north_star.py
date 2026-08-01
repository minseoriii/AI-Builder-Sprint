import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_authenticated_user_id
from app.core.config import settings
from app.core.exceptions import NorthStarNotFoundError
from app.db.session import get_db
from app.models.north_star import NorthStar
from app.schemas.north_star import NorthStarResponse, NorthStarUpdateRequest
from app.services.auth import get_or_create_profile
from app.services.north_star_analysis import analyze_north_star, get_north_star_prompt_version
from app.services.upstage import UpstageClient, get_upstage_client

router = APIRouter(prefix="/north-star")


@router.put("", response_model=NorthStarResponse)
def upsert_north_star(
    body: NorthStarUpdateRequest,
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
    client: UpstageClient = Depends(get_upstage_client),
) -> NorthStar:
    get_or_create_profile(db, user_id)
    ai_result = analyze_north_star(body.text, client)

    existing = db.query(NorthStar).filter(NorthStar.user_id == user_id).one_or_none()
    core_values = [cv.model_dump() for cv in ai_result.core_values]

    if existing:
        existing.original_text = body.text
        existing.summary = ai_result.summary
        existing.core_values = core_values
        existing.related_domains = ai_result.related_domains
        existing.model_name = settings.upstage_model
        existing.prompt_version = get_north_star_prompt_version()
        north_star = existing
    else:
        north_star = NorthStar(
            user_id=user_id,
            original_text=body.text,
            summary=ai_result.summary,
            core_values=core_values,
            related_domains=ai_result.related_domains,
            model_name=settings.upstage_model,
            prompt_version=get_north_star_prompt_version(),
        )
        db.add(north_star)

    db.commit()
    db.refresh(north_star)
    return north_star


@router.get("", response_model=NorthStarResponse)
def get_north_star(
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> NorthStar:
    north_star = db.query(NorthStar).filter(NorthStar.user_id == user_id).one_or_none()
    if north_star is None:
        raise NorthStarNotFoundError()
    return north_star
