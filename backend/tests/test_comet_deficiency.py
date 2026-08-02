import uuid
from datetime import UTC, date, datetime, timedelta

from app.models.comet import Comet
from app.models.comet_recommendation import CometRecommendation
from app.models.north_star import NorthStar
from app.models.selected_constellation import SelectedConstellation
from app.models.star import Star
from app.models.user_profile import UserProfile
from app.schemas.comet import CometRecommendationStatus, CometStatus
from app.schemas.daily_record import StarSourceType
from app.services.comet_deficiency import (
    find_recommendable_category,
    has_recent_duplicate_title,
    normalize_title,
    select_deficient_category,
)
from tests.conftest import TEST_USER_ID


def _setup_north_star(
    db_session,
    categories: list[str],
    *,
    user_id: uuid.UUID = TEST_USER_ID,
) -> NorthStar:
    db_session.add(UserProfile(id=user_id, onboarding_completed=True))
    north_star = NorthStar(
        user_id=user_id,
        original_text="가족과 건강을 지키면서 배우고 싶다.",
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
    return north_star


def _add_star(db_session, category: str, *, user_id: uuid.UUID = TEST_USER_ID) -> Star:
    star = Star(
        user_id=user_id,
        source_type=StarSourceType.DAILY_RECORD.value,
        source_id=uuid.uuid4(),
        category=category,
        recorded_on=date(2026, 7, 15),
        preview="preview",
    )
    db_session.add(star)
    db_session.commit()
    return star


def test_select_deficient_category_minimum(db_session):
    _setup_north_star(db_session, ["가족", "건강", "성장·배움"])
    _add_star(db_session, "가족")
    _add_star(db_session, "가족")
    _add_star(db_session, "가족")
    _add_star(db_session, "가족")
    _add_star(db_session, "가족")
    _add_star(db_session, "성장·배움")
    _add_star(db_session, "성장·배움")
    _add_star(db_session, "성장·배움")
    _add_star(db_session, "건강")

    result = select_deficient_category(db_session, TEST_USER_ID, ["가족", "건강", "성장·배움"])
    assert result == "건강"


def test_select_deficient_category_tie_break_canonical(db_session):
    _setup_north_star(db_session, ["가족", "건강"])
    result = select_deficient_category(db_session, TEST_USER_ID, ["가족", "건강"])
    assert result == "가족"


def test_select_deficient_category_single_active(db_session):
    _setup_north_star(db_session, ["건강"])
    assert select_deficient_category(db_session, TEST_USER_ID, ["건강"]) == "건강"


def test_select_deficient_category_no_stars(db_session):
    _setup_north_star(db_session, ["가족", "건강"])
    result = select_deficient_category(db_session, TEST_USER_ID, ["가족", "건강"])
    assert result == "가족"


def test_unselected_stars_not_in_active_counts(db_session):
    _setup_north_star(db_session, ["가족"])
    _add_star(db_session, "건강")
    result = select_deficient_category(db_session, TEST_USER_ID, ["가족"])
    assert result == "가족"


def test_pending_comet_excludes_category(db_session):
    _setup_north_star(db_session, ["가족", "건강"])
    db_session.add(
        Comet(
            user_id=TEST_USER_ID,
            source_type="USER_CREATED",
            target_category="가족",
            title="test",
            status=CometStatus.PENDING.value,
        )
    )
    db_session.commit()
    assert find_recommendable_category(db_session, TEST_USER_ID, ["가족", "건강"]) == "건강"


def test_pending_recommendation_excludes_category(db_session):
    _setup_north_star(db_session, ["가족", "건강"])
    db_session.add(
        CometRecommendation(
            user_id=TEST_USER_ID,
            target_category="가족",
            title="추천",
            description="desc",
            reason="reason",
            estimated_minutes=10,
            status=CometRecommendationStatus.PENDING.value,
            model_name="solar-pro3",
            prompt_version="v1",
            expires_at=datetime.now(UTC) + timedelta(hours=1),
        )
    )
    db_session.commit()
    assert find_recommendable_category(db_session, TEST_USER_ID, ["가족", "건강"]) == "건강"


def test_duplicate_title_detection(db_session):
    _setup_north_star(db_session, ["건강"])
    db_session.add(
        CometRecommendation(
            user_id=TEST_USER_ID,
            target_category="건강",
            title="  저녁에 20분 산책하기 ",
            description="desc",
            reason="reason",
            estimated_minutes=20,
            status=CometRecommendationStatus.REJECTED.value,
            model_name="solar-pro3",
            prompt_version="v1",
            expires_at=datetime.now(UTC) + timedelta(hours=1),
        )
    )
    db_session.commit()
    assert has_recent_duplicate_title(db_session, TEST_USER_ID, "저녁에 20분 산책하기")


def test_normalize_title():
    assert normalize_title("  Hello   World ") == "hello world"
