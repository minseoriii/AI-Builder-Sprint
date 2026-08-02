from fastapi import APIRouter

from app.core.constants import (
    COMPANION_TYPES,
    CORE_VALUE_TAGS,
    LIFE_DOMAIN_TAGS,
    SENSORY_TAGS,
)
from app.schemas.tags import TagsResponse

router = APIRouter(prefix="/tags")


@router.get("", response_model=TagsResponse)
def get_tags() -> TagsResponse:
    return TagsResponse(
        core_values=list(CORE_VALUE_TAGS),
        life_domains=list(LIFE_DOMAIN_TAGS),
        sensory_tags=list(SENSORY_TAGS),
        companion_types=list(COMPANION_TYPES),
    )
