import uuid
from datetime import date

from app.models.comet import Comet

from app.models.daily_record import DailyRecord

from app.models.daily_record_tag import DailyRecordTag

from app.models.star import Star

from app.models.user_profile import UserProfile

from app.schemas.daily_record import StarSourceType

from tests.conftest import OTHER_USER_ID, TEST_USER_ID





def _setup_user(db_session):

    db_session.add(UserProfile(id=TEST_USER_ID, onboarding_completed=True))

    db_session.commit()





def _create_daily_record_star(db_session) -> Star:

    record = DailyRecord(

        user_id=TEST_USER_ID,

        original_text="민서랑 아웃백에서 치킨 먹고 편하게 얘기함.",

        recorded_on=date(2026, 7, 31),

        primary_category="관계·사랑",

        ai_primary_category="관계·사랑",

        category_overridden=False,

        category_ranking=[],

    )

    db_session.add(record)

    db_session.flush()

    db_session.add(

        DailyRecordTag(

            daily_record_id=record.id,

            dimension="PERSON",

            value="민서",

            source="USER",

            sort_order=0,

        )

    )

    star = Star(

        user_id=TEST_USER_ID,

        source_type=StarSourceType.DAILY_RECORD.value,

        source_id=record.id,

        category="관계·사랑",

        recorded_on=record.recorded_on,

        preview=record.original_text[:120],

    )

    db_session.add(star)

    db_session.commit()

    return star





def test_get_star_detail_daily_record(client, db_session):

    _setup_user(db_session)

    star = _create_daily_record_star(db_session)

    response = client.get(f"/api/v1/stars/{star.id}")

    assert response.status_code == 200

    body = response.json()

    assert body["recorded_year"] == 2026

    assert body["recorded_month"] == 7

    assert body["recorded_day"] == 31

    assert "민서" in body["content"]

    assert body["tags"]["PERSON"] == ["민서"]





def test_list_constellation_stars(client, db_session):

    _setup_user(db_session)

    _create_daily_record_star(db_session)

    response = client.get("/api/v1/constellations/관계·사랑/stars")

    assert response.status_code == 200

    body = response.json()

    assert body["category"] == "관계·사랑"

    assert len(body["stars"]) == 1

    assert body["stars"][0]["tags"]["PERSON"] == ["민서"]





def test_get_star_detail_other_user_forbidden(client, db_session):

    _setup_user(db_session)

    star = Star(

        user_id=OTHER_USER_ID,

        source_type=StarSourceType.DAILY_RECORD.value,

        source_id=uuid.uuid4(),

        category="건강",

        recorded_on=date(2026, 7, 31),

        preview="other",

    )

    db_session.add(star)

    db_session.commit()

    response = client.get(f"/api/v1/stars/{star.id}")

    assert response.status_code == 404





def test_list_constellation_stars_invalid_category(client, db_session):

    _setup_user(db_session)

    response = client.get("/api/v1/constellations/invalid/stars")

    assert response.status_code == 422


