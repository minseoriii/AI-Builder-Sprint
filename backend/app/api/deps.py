import uuid

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user_profile import UserProfile
from app.services.auth import get_current_user_id, get_or_create_user_profile


def get_authenticated_user_id(
    user_id: uuid.UUID = Depends(get_current_user_id),
) -> uuid.UUID:
    return user_id


def ensure_user_profile(
    user_id: uuid.UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> UserProfile:
    return get_or_create_user_profile(db, user_id)
