
from fastapi import APIRouter, Depends

from app.api.deps import ensure_profile
from app.models.profile import Profile
from app.schemas.profile import ProfileResponse

router = APIRouter(prefix="/profile")


@router.get("", response_model=ProfileResponse)
def get_profile(
    profile: Profile = Depends(ensure_profile),
) -> Profile:
    return profile
