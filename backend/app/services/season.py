import calendar
from datetime import date

from app.core.config import settings
from app.schemas.galaxy import Season


def today_in_user_timezone() -> date:
    from datetime import datetime
    from zoneinfo import ZoneInfo

    tz = ZoneInfo(settings.default_timezone)
    return datetime.now(tz).date()


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
