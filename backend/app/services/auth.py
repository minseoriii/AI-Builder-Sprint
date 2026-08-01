import uuid

import httpx
from fastapi import Header
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    AuthServiceUnavailableError,
    AuthTokenInvalidError,
    AuthTokenMissingError,
)
from app.models.user_profile import UserProfile


def verify_supabase_token(token: str) -> uuid.UUID:
    if not settings.supabase_auth_configured:
        raise AuthServiceUnavailableError()

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    headers = {
        "apikey": settings.supabase_publishable_key,
        "Authorization": f"Bearer {token}",
    }

    try:
        with httpx.Client(timeout=settings.supabase_auth_timeout_seconds) as client:
            response = client.get(url, headers=headers)
    except httpx.RequestError as exc:
        raise AuthServiceUnavailableError() from exc

    if response.status_code == 401:
        raise AuthTokenInvalidError()
    if response.status_code >= 500:
        raise AuthServiceUnavailableError()
    if response.status_code != 200:
        raise AuthTokenInvalidError()

    data = response.json()
    user_id = data.get("id")
    if not user_id:
        raise AuthTokenInvalidError()

    return uuid.UUID(user_id)


def get_current_user_id(authorization: str | None = Header(default=None)) -> uuid.UUID:
    if not authorization:
        raise AuthTokenMissingError()

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise AuthTokenInvalidError()

    token = parts[1]
    if not token:
        raise AuthTokenInvalidError()

    return verify_supabase_token(token)


def get_or_create_user_profile(db: Session, user_id: uuid.UUID) -> UserProfile:
    profile = db.get(UserProfile, user_id)
    if profile is not None:
        return profile

    profile = UserProfile(id=user_id, onboarding_completed=False)
    db.add(profile)
    try:
        db.commit()
        db.refresh(profile)
        return profile
    except IntegrityError:
        db.rollback()
        existing = db.get(UserProfile, user_id)
        if existing is None:
            raise
        return existing
