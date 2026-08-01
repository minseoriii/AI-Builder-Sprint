import uuid
from datetime import date

from app.models.north_star import NorthStar
from app.models.selected_constellation import SelectedConstellation
from app.models.star import Star
from app.models.user_profile import UserProfile
from app.schemas.daily_record import StarSourceType
from app.schemas.galaxy import Season
from app.services.galaxy_statistics import compute_overview_statistics
from app.services.season import (
    get_season_date_range,
    season_for_date,
    season_year_for_date,
)
from tests.conftest import TEST_USER_ID


def _setup(db_session, categories: list[str]):
    db_session.add(UserProfile(id=TEST_USER_ID, onboarding_completed=True))
    north_star = NorthStar(
        user_id=TEST_USER_ID,
        original_text="가족과 건강",
        is_active=True,
    )
    db_session.add(north_star)
    db_session.flush()
    for index, category in enumerate(categories):
        db_session.add(
            SelectedConstellation(
                north_star_id=north_star.id,
                category=category,
                sort_order=index,
                ai_recommended=True,
                ai_score=0.9,
            )
        )
    db_session.commit()


def test_season_winter_year_boundary():
    assert season_year_for_date(date(2027, 1, 15)) == 2026
    assert season_for_date(date(2027, 1, 15)) == Season.WINTER
    start, end = get_season_date_range(2026, Season.WINTER)
    assert start == date(2026, 12, 1)
    assert end == date(2027, 2, 28)


def test_overview_no_stars(db_session):
    _setup(db_session, ["가족", "건강"])
    year, season = 2026, Season.SUMMER
    start, end = get_season_date_range(year, season)
    stats = compute_overview_statistics(
        db_session,
        TEST_USER_ID,
        year=year,
        season=season,
        period_start=start,
        period_end=end,
        effective_end=date(2026, 7, 31),
    )
    assert stats["total_star_count"] == 0
    assert stats["observation_days"] == 0
    assert all(item["ratio"] == 0.0 for item in stats["constellations"])


def test_overview_mixed_star_sources(db_session):
    _setup(db_session, ["가족", "건강"])
    db_session.add(
        Star(
            user_id=TEST_USER_ID,
            source_type=StarSourceType.DAILY_RECORD.value,
            source_id=uuid.uuid4(),
            category="가족",
            recorded_on=date(2026, 7, 10),
            preview="daily",
        )
    )
    db_session.add(
        Star(
            user_id=TEST_USER_ID,
            source_type=StarSourceType.COMET.value,
            source_id=uuid.uuid4(),
            category="건강",
            recorded_on=date(2026, 7, 20),
            preview="comet",
        )
    )
    db_session.commit()

    year, season = 2026, Season.SUMMER
    start, end = get_season_date_range(year, season)
    stats = compute_overview_statistics(
        db_session,
        TEST_USER_ID,
        year=year,
        season=season,
        period_start=start,
        period_end=end,
        effective_end=date(2026, 7, 31),
    )
    assert stats["total_star_count"] == 2
    assert stats["observation_days"] == 22
    assert stats["largest_category"]["category"] in {"가족", "건강"}


def test_ratio_zero_division(db_session):
    _setup(db_session, ["가족"])
    year, season = 2026, Season.SUMMER
    start, end = get_season_date_range(year, season)
    stats = compute_overview_statistics(
        db_session,
        TEST_USER_ID,
        year=year,
        season=season,
        period_start=start,
        period_end=end,
        effective_end=date(2026, 7, 31),
    )
    assert stats["constellations"][0]["ratio"] == 0.0
