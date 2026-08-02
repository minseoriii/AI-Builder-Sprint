from fastapi import APIRouter

from app.core.config import settings
from app.schemas.common import ReadyResponse

router = APIRouter()


@router.get("/ready", response_model=ReadyResponse)
def readiness_check() -> ReadyResponse:
    return ReadyResponse(
        database_configured=settings.database_configured,
        upstage_configured=settings.upstage_configured,
        supabase_auth_configured=settings.supabase_auth_configured,
    )
