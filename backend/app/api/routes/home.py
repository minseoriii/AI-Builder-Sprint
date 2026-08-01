import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_authenticated_user_id
from app.db.session import get_db
from app.schemas.daily_record import HomeResponse
from app.services.auth import get_or_create_user_profile
from app.services.home import get_home

router = APIRouter()


@router.get("/home", response_model=HomeResponse)
def read_home(
    user_id: uuid.UUID = Depends(get_authenticated_user_id),
    db: Session = Depends(get_db),
) -> HomeResponse:
    get_or_create_user_profile(db, user_id)
    return get_home(db, user_id)
