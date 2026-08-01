import uuid
from collections import Counter, defaultdict
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.constants import CONSTELLATION_CATEGORIES, DAILY_RECORD_DIMENSIONS
from app.models.daily_record_tag import DailyRecordTag
from app.models.north_star import NorthStar
from app.models.star import Star
from app.schemas.daily_record import StarSourceType
from app.schemas.galaxy import Season
from app.services.season import months_in_season


def _get_north_star_context(
    db: Session, user_id: uuid.UUID
) -> tuple[NorthStar | None, list[str], str | None]:
    north_star = (
        db.query(NorthStar)
        .filter(NorthStar.user_id == user_id, NorthStar.is_active.is_(True))
        .one_or_none()
    )
    if north_star is None:
        return None, [], None
    selected = [item.category for item in north_star.selected_constellations]
    return north_star, selected, north_star.original_text


def _stars_in_period(
    db: Session,
    user_id: uuid.UUID,
    period_start: date,
    period_end: date,
) -> list[Star]:
    return (
        db.query(Star)
        .filter(
            Star.user_id == user_id,
            Star.recorded_on >= period_start,
            Star.recorded_on <= period_end,
        )
        .order_by(Star.recorded_on.asc(), Star.created_at.asc())
        .all()
    )


def _count_by_category(stars: list[Star]) -> dict[str, int]:
    counts = {category: 0 for category in CONSTELLATION_CATEGORIES}
    for star in stars:
        if star.category in counts:
            counts[star.category] += 1
    return counts


def _observation_days(stars: list[Star], period_end: date) -> int:
    if not stars:
        return 0
    first_date = min(star.recorded_on for star in stars)
    return (period_end - first_date).days + 1


def _ratio(star_count: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round(star_count / total, 4)


def _largest_category(counts: dict[str, int]) -> dict | None:
    positive = {category: count for category, count in counts.items() if count > 0}
    if not positive:
        return None
    max_count = max(positive.values())
    tied = [
        category
        for category in CONSTELLATION_CATEGORIES
        if positive.get(category, 0) == max_count
    ]
    category = tied[0]
    return {"category": category, "star_count": max_count}


def _smallest_selected_category(
    selected_categories: list[str], counts: dict[str, int]
) -> dict | None:
    if not selected_categories:
        return None
    ordered = [
        category for category in CONSTELLATION_CATEGORIES if category in selected_categories
    ]
    min_count = min(counts.get(category, 0) for category in ordered)
    tied = [category for category in ordered if counts.get(category, 0) == min_count]
    return {"category": tied[0], "star_count": min_count}


def compute_overview_statistics(
    db: Session,
    user_id: uuid.UUID,
    *,
    year: int,
    season: Season,
    period_start: date,
    period_end: date,
    effective_end: date,
) -> dict:
    north_star, selected_categories, north_star_text = _get_north_star_context(db, user_id)
    stars = _stars_in_period(db, user_id, period_start, effective_end)
    counts = _count_by_category(stars)
    total_star_count = len(stars)

    selected_star_total = sum(counts.get(category, 0) for category in selected_categories)
    unselected_category_star_count = total_star_count - selected_star_total

    constellations = [
        {
            "category": category,
            "selected_from_north_star": True,
            "star_count": counts.get(category, 0),
            "ratio": _ratio(counts.get(category, 0), total_star_count),
        }
        for category in selected_categories
    ]

    observed_constellation_count = sum(1 for count in counts.values() if count > 0)
    unobserved_selected_categories = [
        category
        for category in selected_categories
        if counts.get(category, 0) == 0
    ]

    latest_star_created_at = max((star.created_at for star in stars), default=None)

    return {
        "year": year,
        "season": season.value,
        "north_star_text": north_star_text,
        "north_star_updated_at": north_star.updated_at.isoformat()
        if north_star
        else None,
        "selected_categories": selected_categories,
        "total_star_count": total_star_count,
        "observed_constellation_count": observed_constellation_count,
        "active_constellation_count": len(selected_categories),
        "observation_days": _observation_days(stars, effective_end),
        "unselected_category_star_count": unselected_category_star_count,
        "constellations": constellations,
        "largest_category": _largest_category(counts),
        "smallest_selected_category": _smallest_selected_category(
            selected_categories, counts
        ),
        "unobserved_selected_categories": unobserved_selected_categories,
        "category_counts": counts,
        "latest_star_created_at": latest_star_created_at.isoformat()
        if latest_star_created_at
        else None,
        "period_start": period_start.isoformat(),
        "period_end": period_end.isoformat(),
        "effective_end": effective_end.isoformat(),
    }


def _daily_record_ids_from_stars(stars: list[Star]) -> list[uuid.UUID]:
    return [
        star.source_id
        for star in stars
        if star.source_type == StarSourceType.DAILY_RECORD.value
    ]


def _top_tags_by_dimension(
    db: Session, daily_record_ids: list[uuid.UUID], *, limit: int = 5
) -> list[dict]:
    if not daily_record_ids:
        return [
            {"dimension": dimension, "top_tags": []}
            for dimension in DAILY_RECORD_DIMENSIONS
        ]

    rows = (
        db.query(DailyRecordTag.dimension, DailyRecordTag.value, func.count(DailyRecordTag.id))
        .filter(DailyRecordTag.daily_record_id.in_(daily_record_ids))
        .group_by(DailyRecordTag.dimension, DailyRecordTag.value)
        .all()
    )

    grouped: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for dimension, value, count in rows:
        grouped[dimension].append((value, int(count)))

    result: list[dict] = []
    for dimension in DAILY_RECORD_DIMENSIONS:
        items = grouped.get(dimension, [])
        items.sort(key=lambda item: (-item[1], item[0]))
        result.append(
            {
                "dimension": dimension,
                "top_tags": [
                    {"value": value, "count": count} for value, count in items[:limit]
                ],
            }
        )
    return result


def _monthly_dominant_categories(
    stars: list[Star], year: int, season: Season
) -> list[dict]:
    month_keys = months_in_season(year, season)
    grouped: dict[str, list[Star]] = {month: [] for month in month_keys}
    for star in stars:
        month_key = f"{star.recorded_on.year:04d}-{star.recorded_on.month:02d}"
        if month_key in grouped:
            grouped[month_key].append(star)

    result: list[dict] = []
    for month in month_keys:
        month_stars = grouped[month]
        if not month_stars:
            result.append({"month": month, "category": None, "star_count": 0})
            continue
        counts = Counter(star.category for star in month_stars)
        max_count = max(counts.values())
        tied = [
            category
            for category in CONSTELLATION_CATEGORIES
            if counts.get(category, 0) == max_count
        ]
        result.append(
            {
                "month": month,
                "category": tied[0],
                "star_count": max_count,
            }
        )
    return result


def _largest_category_tag_trends(
    db: Session,
    stars: list[Star],
    largest_category: dict | None,
    *,
    limit: int = 5,
) -> dict | None:
    if largest_category is None:
        return None

    category = largest_category["category"]
    daily_record_ids = [
        star.source_id
        for star in stars
        if star.source_type == StarSourceType.DAILY_RECORD.value
        and star.category == category
    ]
    if not daily_record_ids:
        return {
            "category": category,
            "PERSON": [],
            "PLACE": [],
            "ACTIVITY": [],
            "TIME": [],
            "EMOTION": [],
        }

    rows = (
        db.query(DailyRecordTag.dimension, DailyRecordTag.value, func.count(DailyRecordTag.id))
        .filter(DailyRecordTag.daily_record_id.in_(daily_record_ids))
        .group_by(DailyRecordTag.dimension, DailyRecordTag.value)
        .all()
    )
    grouped: dict[str, list[tuple[str, int]]] = defaultdict(list)
    for dimension, value, count in rows:
        grouped[dimension].append((value, int(count)))

    trends: dict = {"category": category}
    for dimension in DAILY_RECORD_DIMENSIONS:
        items = grouped.get(dimension, [])
        items.sort(key=lambda item: (-item[1], item[0]))
        trends[dimension] = [
            {"value": value, "count": count} for value, count in items[:limit]
        ]
    return trends


def compute_season_report_statistics(
    db: Session,
    user_id: uuid.UUID,
    *,
    year: int,
    season: Season,
    period_start: date,
    period_end: date,
    effective_end: date,
) -> dict:
    north_star, selected_categories, north_star_text = _get_north_star_context(db, user_id)
    stars = _stars_in_period(db, user_id, period_start, effective_end)
    counts = _count_by_category(stars)
    total_star_count = len(stars)

    overall_distribution = [
        {
            "category": category,
            "star_count": counts.get(category, 0),
            "ratio": _ratio(counts.get(category, 0), total_star_count),
        }
        for category in CONSTELLATION_CATEGORIES
    ]

    selected_distribution = [
        {
            "category": category,
            "star_count": counts.get(category, 0),
            "ratio": _ratio(counts.get(category, 0), total_star_count),
        }
        for category in selected_categories
    ]

    largest_category = _largest_category(counts)
    smallest_selected = _smallest_selected_category(selected_categories, counts)
    unobserved_selected_categories = [
        category
        for category in selected_categories
        if counts.get(category, 0) == 0
    ]

    daily_record_ids = _daily_record_ids_from_stars(stars)
    dimension_tag_frequencies = _top_tags_by_dimension(db, daily_record_ids)
    monthly_dominant_categories = _monthly_dominant_categories(stars, year, season)
    largest_category_tag_trends = _largest_category_tag_trends(
        db, stars, largest_category
    )

    return {
        "year": year,
        "season": season.value,
        "season_start": period_start.isoformat(),
        "season_end": period_end.isoformat(),
        "generated_through": effective_end.isoformat(),
        "north_star_text": north_star_text,
        "selected_categories": selected_categories,
        "total_star_count": total_star_count,
        "observed_constellation_count": sum(1 for count in counts.values() if count > 0),
        "observation_days": _observation_days(stars, effective_end),
        "overall_distribution": overall_distribution,
        "selected_distribution": selected_distribution,
        "largest_category": largest_category,
        "smallest_selected_category": smallest_selected,
        "unobserved_selected_categories": unobserved_selected_categories,
        "dimension_tag_frequencies": dimension_tag_frequencies,
        "monthly_dominant_categories": monthly_dominant_categories,
        "largest_category_tag_trends": largest_category_tag_trends,
        "north_star_snapshot": {
            "text": north_star_text,
            "selected_categories": selected_categories,
        },
    }


def build_overview_summary_payload(stats: dict) -> dict:
    return {
        "north_star_text": stats["north_star_text"],
        "selected_categories": stats["selected_categories"],
        "year": stats["year"],
        "season": stats["season"],
        "total_star_count": stats["total_star_count"],
        "constellations": stats["constellations"],
        "largest_category": stats["largest_category"],
        "smallest_selected_category": stats["smallest_selected_category"],
        "unobserved_selected_categories": stats["unobserved_selected_categories"],
    }


def build_overview_fingerprint(stats: dict) -> str:
    category_parts = ",".join(
        f"{item['category']}:{item['star_count']}"
        for item in stats["constellations"]
    )
    return "|".join(
        [
            str(stats.get("north_star_updated_at") or ""),
            str(stats["total_star_count"]),
            str(stats.get("latest_star_created_at") or ""),
            category_parts,
        ]
    )


def allowed_categories_from_stats(stats: dict) -> set[str]:
    allowed = set(stats.get("selected_categories") or [])
    if stats.get("largest_category"):
        allowed.add(stats["largest_category"]["category"])
    if stats.get("smallest_selected_category"):
        allowed.add(stats["smallest_selected_category"]["category"])
    allowed.update(stats.get("unobserved_selected_categories") or [])
    for item in stats.get("constellations") or []:
        if item.get("star_count", 0) > 0:
            allowed.add(item["category"])
    return allowed


def build_reflection_question(stats: dict, season_label: str) -> str:
    year = stats["year"]
    season_name = season_label
    largest = stats.get("largest_category")
    if largest is None or stats.get("total_star_count", 0) == 0:
        return (
            f"{year}년 {season_name}은 아직 관측된 별이 없습니다. "
            "이 계절을 한 문장으로 남긴다면 어떻게 표현하고 싶나요?"
        )
    category = largest["category"]
    return (
        f"{year}년 {season_name}, 가장 많은 별이 모인 성단은 {category}이었습니다. "
        "이 계절은 사용자에게 어떤 시간이었나요?"
    )
