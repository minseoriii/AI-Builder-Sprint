import uuid
from datetime import date
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.daily_record import DailyRecord
from app.models.north_star import NorthStar
from app.models.star import Star
from app.schemas.daily_record import (
    HomeConstellationResponse,
    HomeResponse,
    HomeStarResponse,
    StarSourceType,
)
from app.services.comet_recommendation import get_home_comet_recommendation


def _today_in_user_timezone() -> date:
    tz = ZoneInfo(settings.default_timezone)
    from datetime import datetime

    return datetime.now(tz).date()


def get_home(db: Session, user_id: uuid.UUID) -> HomeResponse:
    north_star = (
        db.query(NorthStar)
        .filter(NorthStar.user_id == user_id, NorthStar.is_active.is_(True))
        .one_or_none()
    )
    north_star_text = north_star.original_text if north_star else None

    selected_categories: set[str] = set()
    if north_star is not None:
        selected_categories = {
            item.category for item in north_star.selected_constellations
        }

    stars = (
        db.query(Star)
        .filter(Star.user_id == user_id)
        .order_by(Star.recorded_on.desc(), Star.created_at.desc())
        .all()
    )

    star_categories = {star.category for star in stars}
    all_categories = selected_categories | star_categories

    stars_by_category: dict[str, list[Star]] = {cat: [] for cat in all_categories}
    for star in stars:
        if star.category in stars_by_category:
            stars_by_category[star.category].append(star)

    today = _today_in_user_timezone()
    today_recorded = (
        db.query(DailyRecord.id)
        .filter(
            DailyRecord.user_id == user_id,
            DailyRecord.recorded_on == today,
        )
        .first()
        is not None
    )

    constellations: list[HomeConstellationResponse] = []
    for category in sorted(all_categories):
        category_stars = stars_by_category.get(category, [])
        constellations.append(
            HomeConstellationResponse(
                category=category,
                selected_from_north_star=category in selected_categories,
                star_count=len(category_stars),
                stars=[
                    HomeStarResponse(
                        id=str(star.id),
                        source_type=StarSourceType(star.source_type),
                        recorded_on=star.recorded_on,
                        preview=star.preview,
                    )
                    for star in category_stars
                ],
            )
        )

    comet_recommendation = get_home_comet_recommendation(db, user_id)

    return HomeResponse(
        north_star_text=north_star_text,
        today_recorded=today_recorded,
        total_star_count=len(stars),
        constellations=constellations,
        comet_recommendation=comet_recommendation,
    )
