import calendar
from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.config import settings
from app.models.north_star import NorthStar
from app.schemas.galaxy import Season, season_label


def today_in_user_timezone() -> date:
    tz = ZoneInfo(settings.default_timezone)
    return datetime.now(tz).date()


def date_in_user_timezone(value: datetime) -> date:
    tz = ZoneInfo(settings.default_timezone)
    if value.tzinfo is None:
        value = value.replace(tzinfo=ZoneInfo("UTC"))
    return value.astimezone(tz).date()


def season_period_for_date(value: date) -> tuple[int, Season]:
    return season_year_for_date(value), season_for_date(value)


def season_for_date(value: date) -> Season:
    month = value.month
    if month in (3, 4, 5):
        return Season.SPRING
    if month in (6, 7, 8):
        return Season.SUMMER
    if month in (9, 10, 11):
        return Season.AUTUMN
    return Season.WINTER


def season_year_for_date(value: date) -> int:
    if value.month == 12:
        return value.year
    if value.month in (1, 2):
        return value.year - 1
    return value.year


def get_current_season_and_year(today: date | None = None) -> tuple[int, Season]:
    today = today or today_in_user_timezone()
    return season_year_for_date(today), season_for_date(today)


def get_season_date_range(year: int, season: Season) -> tuple[date, date]:
    if season == Season.SPRING:
        return date(year, 3, 1), date(year, 5, 31)
    if season == Season.SUMMER:
        return date(year, 6, 1), date(year, 8, 31)
    if season == Season.AUTUMN:
        return date(year, 9, 1), date(year, 11, 30)
    return date(year, 12, 1), date(year + 1, 2, calendar.monthrange(year + 1, 2)[1])


def get_effective_end_date(season_start: date, season_end: date, today: date | None = None) -> date:
    today = today or today_in_user_timezone()
    if today < season_start:
        return season_start
    return min(season_end, today)


def is_future_season(year: int, season: Season, today: date | None = None) -> bool:
    today = today or today_in_user_timezone()
    season_start, _ = get_season_date_range(year, season)
    return season_start > today


def next_season_start(year: int, season: Season) -> date:
    if season == Season.SPRING:
        return date(year, 6, 1)
    if season == Season.SUMMER:
        return date(year, 9, 1)
    if season == Season.AUTUMN:
        return date(year, 12, 1)
    return date(year + 1, 3, 1)


def is_north_star_editable(
    north_star: NorthStar,
    today: date | None = None,
) -> bool:
    today = today or today_in_user_timezone()
    locked_date = date_in_user_timezone(north_star.updated_at)
    locked_year, locked_season = season_period_for_date(locked_date)
    current_year, current_season = season_period_for_date(today)
    return (current_year, current_season) != (locked_year, locked_season)


def get_north_star_editability(
    north_star: NorthStar,
    today: date | None = None,
) -> dict:
    today = today or today_in_user_timezone()
    locked_date = date_in_user_timezone(north_star.updated_at)
    locked_year, locked_season = season_period_for_date(locked_date)
    editable = is_north_star_editable(north_star, today)
    return {
        "editable": editable,
        "locked_season_year": locked_year,
        "locked_season": locked_season.value,
        "locked_season_label": season_label(locked_season),
        "editable_from": None if editable else next_season_start(locked_year, locked_season),
    }


def months_in_season(year: int, season: Season) -> list[str]:
    season_start, season_end = get_season_date_range(year, season)
    months: list[str] = []
    current = date(season_start.year, season_start.month, 1)
    while current <= season_end:
        months.append(f"{current.year:04d}-{current.month:02d}")
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)
    return months
