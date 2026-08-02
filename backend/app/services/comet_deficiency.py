import re
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.constants import COMET_DUPLICATE_TITLE_DAYS, CONSTELLATION_CATEGORIES
from app.models.comet import Comet
from app.models.comet_recommendation import CometRecommendation
from app.models.north_star import NorthStar
from app.models.star import Star
from app.schemas.comet import CometRecommendationStatus, CometStatus


def normalize_title(title: str) -> str:
    collapsed = re.sub(r"\s+", " ", title.strip())
    return collapsed.casefold()


def count_stars_by_category(
    db: Session,
    user_id: uuid.UUID,
    categories: list[str],
) -> dict[str, int]:
    counts = {category: 0 for category in categories}
    rows = (
        db.query(Star.category, func.count(Star.id))
        .filter(Star.user_id == user_id, Star.category.in_(categories))
        .group_by(Star.category)
        .all()
    )
    for category, count in rows:
        counts[category] = int(count)
    return counts


def _latest_recommendation_time_by_category(
    db: Session,
    user_id: uuid.UUID,
    categories: list[str],
) -> dict[str, datetime | None]:
    result = {category: None for category in categories}
    rows = (
        db.query(
            CometRecommendation.target_category,
            func.max(CometRecommendation.created_at),
        )
        .filter(
            CometRecommendation.user_id == user_id,
            CometRecommendation.target_category.in_(categories),
        )
        .group_by(CometRecommendation.target_category)
        .all()
    )
    for category, latest in rows:
        result[category] = latest
    return result


def get_active_selected_categories(db: Session, user_id: uuid.UUID) -> list[str]:
    north_star = (
        db.query(NorthStar)
        .filter(NorthStar.user_id == user_id, NorthStar.is_active.is_(True))
        .one_or_none()
    )
    if north_star is None:
        return []
    return [item.category for item in north_star.selected_constellations]


def select_deficient_category(
    db: Session,
    user_id: uuid.UUID,
    active_categories: list[str],
) -> str | None:
    if not active_categories:
        return None

    ordered_categories = [
        category for category in CONSTELLATION_CATEGORIES if category in active_categories
    ]
    star_counts = count_stars_by_category(db, user_id, ordered_categories)
    min_count = min(star_counts.values())

    candidates = [
        category for category in ordered_categories if star_counts[category] == min_count
    ]
    if len(candidates) == 1:
        return candidates[0]

    latest_recommendations = _latest_recommendation_time_by_category(
        db, user_id, candidates
    )
    never_recommended = [
        category
        for category in candidates
        if latest_recommendations.get(category) is None
    ]
    if never_recommended:
        return never_recommended[0]

    oldest_recommendation = min(
        candidates,
        key=lambda category: latest_recommendations[category] or datetime.min.replace(tzinfo=UTC),
    )
    return oldest_recommendation


def category_has_pending_comet(db: Session, user_id: uuid.UUID, category: str) -> bool:
    return (
        db.query(Comet.id)
        .filter(
            Comet.user_id == user_id,
            Comet.target_category == category,
            Comet.status == CometStatus.PENDING.value,
        )
        .first()
        is not None
    )


def category_has_pending_recommendation(
    db: Session, user_id: uuid.UUID, category: str
) -> bool:
    now = datetime.now(UTC)
    return (
        db.query(CometRecommendation.id)
        .filter(
            CometRecommendation.user_id == user_id,
            CometRecommendation.target_category == category,
            CometRecommendation.status == CometRecommendationStatus.PENDING.value,
            CometRecommendation.expires_at >= now,
        )
        .first()
        is not None
    )


def has_recent_duplicate_title(
    db: Session,
    user_id: uuid.UUID,
    title: str,
    *,
    days: int = COMET_DUPLICATE_TITLE_DAYS,
) -> bool:
    normalized = normalize_title(title)
    cutoff = datetime.now(UTC) - timedelta(days=days)
    recent = (
        db.query(CometRecommendation.title)
        .filter(
            CometRecommendation.user_id == user_id,
            CometRecommendation.created_at >= cutoff,
        )
        .all()
    )
    return any(normalize_title(row.title) == normalized for row in recent)


def find_recommendable_category(
    db: Session,
    user_id: uuid.UUID,
    active_categories: list[str],
) -> str | None:
    category = select_deficient_category(db, user_id, active_categories)
    if category is None:
        return None

    excluded: set[str] = set()
    for candidate in active_categories:
        if category_has_pending_comet(db, user_id, candidate):
            excluded.add(candidate)
        if category_has_pending_recommendation(db, user_id, candidate):
            excluded.add(candidate)

    if category in excluded:
        for candidate in active_categories:
            if candidate in excluded:
                continue
            if category_has_pending_comet(db, user_id, candidate):
                continue
            if category_has_pending_recommendation(db, user_id, candidate):
                continue
            return candidate
        return None

    return category
