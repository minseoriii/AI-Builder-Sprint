import uuid
from datetime import date

from app.models.daily_record import DailyRecord
from app.models.daily_record_tag import DailyRecordTag
from app.models.north_star import NorthStar
from app.models.seasonal_galaxy_report import SeasonalGalaxyReport
from app.models.selected_constellation import SelectedConstellation
from app.models.star import Star
from app.models.user_profile import UserProfile
from app.schemas.daily_record import StarSourceType
from app.schemas.galaxy import Season, SeasonalGalaxyReportAIResponse
from app.services.galaxy_statistics import compute_season_report_statistics
from app.services.season import get_season_date_range
from tests.conftest import OTHER_USER_ID, TEST_USER_ID

REPORT_AI = SeasonalGalaxyReportAIResponse(
    title="관계와 성장이 함께 빛난 여름",
    north_star_alignment=(
        "북극성은 가족과 건강을 가리키지만, "
        "실제 기록에서는 성장·배움의 별도 많이 나타났습니다."
    ),
    dominant_category_analysis="가족 성단에는 함께 식사하고 대화한 기록이 자주 모였습니다.",
    record_trend_analysis="기록 전체에서는 편안함과 대화 태그가 자주 등장했습니다.",
    monthly_change_analysis="7월에는 가족 성단이 가장 커졌습니다.",
    unobserved_area_analysis="건강 성단은 아직 관측된 별이 적습니다.",
    closing_observation="이번 계절에는 관계를 돌보면서도 배움을 놓치지 않은 흐름이 나타났습니다.",
)


def _setup(db_session):
    db_session.add(UserProfile(id=TEST_USER_ID, onboarding_completed=True))
    north_star = NorthStar(
        user_id=TEST_USER_ID,
        original_text="가족과 건강",
        is_active=True,
    )
    db_session.add(north_star)
    db_session.flush()
    for index, category in enumerate(["가족", "건강", "성장·배움"]):
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


def test_season_report_generate(client, db_session, mock_upstage_client):
    _setup(db_session)
    mock_upstage_client.complete_json.return_value = REPORT_AI
    response = client.post("/api/v1/galaxy/reports/2026/SUMMER/generate")
    assert response.status_code == 200
    assert response.json()["ai_analysis"]["title"] == REPORT_AI.title
    assert "reflection_question" in response.json()


def test_season_report_reuse(client, db_session, mock_upstage_client):
    _setup(db_session)
    mock_upstage_client.complete_json.return_value = REPORT_AI
    first = client.post("/api/v1/galaxy/reports/2026/SUMMER/generate")
    second = client.post("/api/v1/galaxy/reports/2026/SUMMER/generate")
    assert first.json()["id"] == second.json()["id"]
    mock_upstage_client.complete_json.assert_called_once()


def test_future_season_rejected(client, db_session):
    _setup(db_session)
    response = client.post("/api/v1/galaxy/reports/2099/WINTER/generate")
    assert response.status_code == 422


def test_reflection_save(client, db_session, mock_upstage_client):
    _setup(db_session)
    mock_upstage_client.complete_json.return_value = REPORT_AI
    report_id = client.post("/api/v1/galaxy/reports/2026/SUMMER/generate").json()["id"]
    response = client.put(
        f"/api/v1/galaxy/reports/{report_id}/reflection",
        json={"reflection": "가족과 시간을 보내며 생각한 여름이었다."},
    )
    assert response.status_code == 200
    assert response.json()["reflection"].startswith("가족과")


def test_reflection_blank_rejected(client, db_session, mock_upstage_client):
    _setup(db_session)
    mock_upstage_client.complete_json.return_value = REPORT_AI
    report_id = client.post("/api/v1/galaxy/reports/2026/SUMMER/generate").json()["id"]
    response = client.put(
        f"/api/v1/galaxy/reports/{report_id}/reflection",
        json={"reflection": "   "},
    )
    assert response.status_code == 422


def test_other_user_report_forbidden(client, db_session):
    report = SeasonalGalaxyReport(
        user_id=OTHER_USER_ID,
        year=2026,
        season=Season.SUMMER.value,
        season_start=date(2026, 6, 1),
        season_end=date(2026, 8, 31),
        generated_through=date(2026, 7, 31),
        north_star_snapshot={"text": "x", "selected_categories": []},
        statistics_snapshot={"total_star_count": 0},
        ai_analysis=REPORT_AI.model_dump(),
        model_name="solar-pro3",
        prompt_version="v1",
    )
    db_session.add(report)
    db_session.commit()
    response = client.get(f"/api/v1/galaxy/reports/{report.id}")
    assert response.status_code == 404


def test_tag_frequency_excludes_comet_stars(db_session):
    _setup(db_session)
    record = DailyRecord(
        user_id=TEST_USER_ID,
        original_text="test",
        recorded_on=date(2026, 7, 10),
        primary_category="가족",
        ai_primary_category="가족",
        category_ranking=[],
        source_type=StarSourceType.DAILY_RECORD.value,
    )
    db_session.add(record)
    db_session.flush()
    db_session.add(
        DailyRecordTag(
            daily_record_id=record.id,
            dimension="EMOTION",
            value="편안함",
            source="USER",
            sort_order=0,
        )
    )
    db_session.add(
        Star(
            user_id=TEST_USER_ID,
            source_type=StarSourceType.DAILY_RECORD.value,
            source_id=record.id,
            category="가족",
            recorded_on=date(2026, 7, 10),
            preview="test",
        )
    )
    db_session.add(
        Star(
            user_id=TEST_USER_ID,
            source_type=StarSourceType.COMET.value,
            source_id=uuid.uuid4(),
            category="건강",
            recorded_on=date(2026, 7, 11),
            preview="comet",
        )
    )
    db_session.commit()

    start, end = get_season_date_range(2026, Season.SUMMER)
    stats = compute_season_report_statistics(
        db_session,
        TEST_USER_ID,
        year=2026,
        season=Season.SUMMER,
        period_start=start,
        period_end=end,
        effective_end=date(2026, 7, 31),
    )
    assert stats["total_star_count"] == 2
    emotion_tags = next(
        item for item in stats["dimension_tag_frequencies"] if item["dimension"] == "EMOTION"
    )
    assert emotion_tags["top_tags"] == [{"value": "편안함", "count": 1}]
