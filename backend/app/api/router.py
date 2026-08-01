from fastapi import APIRouter

from app.api.routes import (
    comet_recommendations,
    comets,
    daily_records,
    galaxy,
    home,
    onboarding,
    ready,
)

api_router = APIRouter()
api_router.include_router(ready.router, tags=["health"])
api_router.include_router(onboarding.router, tags=["onboarding"])
api_router.include_router(home.router, tags=["home"])
api_router.include_router(daily_records.router)
api_router.include_router(comet_recommendations.router, tags=["comets"])
api_router.include_router(comets.router, tags=["comets"])
api_router.include_router(comets.stars_router, tags=["stars"])
api_router.include_router(galaxy.router, tags=["galaxy"])
