import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.models.north_star_analysis import NorthStarAnalysis
from app.schemas.onboarding import ConstellationCandidate, NorthStarAnalysisAIResponse
from tests.conftest import OTHER_USER_ID, TEST_USER_ID
from tests.test_north_star_analysis import ORIGINAL_TEXT, _valid_candidates


def _mock_ai_response():
    return NorthStarAnalysisAIResponse(
        candidates=[ConstellationCandidate.model_validate(item) for item in _valid_candidates()]
    )


@pytest.fixture
def mock_ai(mocker):
    mocker.patch(
        "app.services.onboarding.analyze_north_star_constellations",
        return_value=_mock_ai_response(),
    )


def test_onboarding_status_initial(client):
    response = client.get("/api/v1/me/onboarding")
    assert response.status_code == 200
    data = response.json()
    assert data["onboarding_completed"] is False
    assert data["north_star"] is None


def test_analyze_north_star(client, mock_ai):
    response = client.post(
        "/api/v1/onboarding/north-star/analyze",
        json={"text": ORIGINAL_TEXT},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["candidates"]) == 7
    assert data["analysis_id"]


def test_analyze_empty_text(client):
    response = client.post(
        "/api/v1/onboarding/north-star/analyze",
        json={"text": "   "},
    )
    assert response.status_code == 422


def test_save_north_star(client, db_session, mock_ai):
    analyze = client.post(
        "/api/v1/onboarding/north-star/analyze",
        json={"text": ORIGINAL_TEXT},
    )
    analysis_id = analyze.json()["analysis_id"]

    response = client.put(
        "/api/v1/onboarding/north-star",
        json={
            "analysis_id": analysis_id,
            "selected_categories": ["가족", "건강", "성장·배움"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["onboarding_completed"] is True
    assert data["north_star"]["text"] == ORIGINAL_TEXT
    assert data["north_star"]["selected_categories"] == ["가족", "건강", "성장·배움"]


def test_onboarding_status_after_save(client, db_session, mock_ai):
    analyze = client.post(
        "/api/v1/onboarding/north-star/analyze",
        json={"text": ORIGINAL_TEXT},
    )
    analysis_id = analyze.json()["analysis_id"]
    client.put(
        "/api/v1/onboarding/north-star",
        json={
            "analysis_id": analysis_id,
            "selected_categories": ["가족"],
        },
    )

    response = client.get("/api/v1/me/onboarding")
    assert response.status_code == 200
    assert response.json()["onboarding_completed"] is True


def test_save_other_users_analysis(client, db_session, mock_ai):
    analyze = client.post(
        "/api/v1/onboarding/north-star/analyze",
        json={"text": ORIGINAL_TEXT},
    )
    analysis_id = analyze.json()["analysis_id"]

    from app.main import app
    from app.services.auth import get_current_user_id

    def override_other_user():
        return OTHER_USER_ID

    app.dependency_overrides[get_current_user_id] = override_other_user
    try:
        response = client.put(
            "/api/v1/onboarding/north-star",
            json={
                "analysis_id": analysis_id,
                "selected_categories": ["가족"],
            },
        )
        assert response.status_code == 404
        assert response.json()["detail"]["code"] == "ANALYSIS_NOT_FOUND"
    finally:
        app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID


def test_save_expired_analysis(client, db_session, mock_ai):
    analyze = client.post(
        "/api/v1/onboarding/north-star/analyze",
        json={"text": ORIGINAL_TEXT},
    )
    analysis_id = uuid.UUID(analyze.json()["analysis_id"])
    analysis = db_session.get(NorthStarAnalysis, analysis_id)
    analysis.expires_at = datetime.now(UTC) - timedelta(hours=1)
    db_session.commit()

    response = client.put(
        "/api/v1/onboarding/north-star",
        json={
            "analysis_id": str(analysis_id),
            "selected_categories": ["가족"],
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ANALYSIS_EXPIRED"


def test_save_category_not_in_candidates(client, db_session, mock_ai):
    analyze = client.post(
        "/api/v1/onboarding/north-star/analyze",
        json={"text": ORIGINAL_TEXT},
    )
    analysis_id = analyze.json()["analysis_id"]

    response = client.put(
        "/api/v1/onboarding/north-star",
        json={
            "analysis_id": analysis_id,
            "selected_categories": ["커리어·성취"],
        },
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "INVALID_SELECTION"


def test_save_duplicate_selection(client, db_session, mock_ai):
    analyze = client.post(
        "/api/v1/onboarding/north-star/analyze",
        json={"text": ORIGINAL_TEXT},
    )
    analysis_id = analyze.json()["analysis_id"]

    response = client.put(
        "/api/v1/onboarding/north-star",
        json={
            "analysis_id": analysis_id,
            "selected_categories": ["가족", "가족"],
        },
    )
    assert response.status_code == 422


def test_save_already_used_analysis(client, db_session, mock_ai):
    analyze = client.post(
        "/api/v1/onboarding/north-star/analyze",
        json={"text": ORIGINAL_TEXT},
    )
    analysis_id = analyze.json()["analysis_id"]
    client.put(
        "/api/v1/onboarding/north-star",
        json={"analysis_id": analysis_id, "selected_categories": ["가족"]},
    )

    response = client.put(
        "/api/v1/onboarding/north-star",
        json={"analysis_id": analysis_id, "selected_categories": ["건강"]},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ANALYSIS_ALREADY_USED"


def test_profile_idempotent(db_session):
    from app.models.user_profile import UserProfile
    from app.services.auth import get_or_create_user_profile
    from tests.conftest import TEST_USER_ID

    p1 = get_or_create_user_profile(db_session, TEST_USER_ID)
    p2 = get_or_create_user_profile(db_session, TEST_USER_ID)
    assert p1.id == p2.id
    count = db_session.query(UserProfile).filter(UserProfile.id == TEST_USER_ID).count()
    assert count == 1
