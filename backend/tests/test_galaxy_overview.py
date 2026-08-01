

from app.models.north_star import NorthStar
from app.models.selected_constellation import SelectedConstellation
from app.models.user_profile import UserProfile
from app.schemas.galaxy import GalaxyOverviewSummaryAIResponse
from tests.conftest import TEST_USER_ID

SUMMARY_RESPONSE = GalaxyOverviewSummaryAIResponse(
    lines=[
        "북극성은 가족과 건강을 가리키고 있습니다.",
        "이번 여름에는 가족 성단에 가장 많은 별이 모였습니다.",
        "건강 성단은 상대적으로 적어 다음 기록에서 더 관측해 볼 수 있습니다.",
    ]
)


def _setup(db_session):
    db_session.add(UserProfile(id=TEST_USER_ID, onboarding_completed=True))
    north_star = NorthStar(
        user_id=TEST_USER_ID,
        original_text="가족과 건강을 지키면서 배우고 싶다.",
        is_active=True,
    )
    db_session.add(north_star)
    db_session.flush()
    for index, category in enumerate(["가족", "건강"]):
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


def test_galaxy_overview_three_lines(client, db_session, mock_upstage_client):
    _setup(db_session)
    mock_upstage_client.complete_json.return_value = SUMMARY_RESPONSE
    response = client.get("/api/v1/galaxy/overview", params={"year": 2026, "season": "SUMMER"})
    assert response.status_code == 200
    assert len(response.json()["summary"]["lines"]) == 3


def test_galaxy_overview_summary_cache(client, db_session, mock_upstage_client):
    _setup(db_session)
    mock_upstage_client.complete_json.return_value = SUMMARY_RESPONSE
    client.get("/api/v1/galaxy/overview", params={"year": 2026, "season": "SUMMER"})
    client.get("/api/v1/galaxy/overview", params={"year": 2026, "season": "SUMMER"})
    assert mock_upstage_client.complete_json.call_count == 1


def test_galaxy_overview_invalid_season(client, db_session):
    _setup(db_session)
    response = client.get("/api/v1/galaxy/overview", params={"season": "INVALID"})
    assert response.status_code == 422


def test_galaxy_overview_ai_failure(client, db_session, mock_upstage_client):
    from app.core.exceptions import AIResponseInvalidError

    _setup(db_session)
    mock_upstage_client.complete_json.side_effect = AIResponseInvalidError()
    response = client.get("/api/v1/galaxy/overview", params={"year": 2026, "season": "SUMMER"})
    assert response.status_code == 502
