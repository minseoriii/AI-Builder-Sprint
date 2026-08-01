import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.core.exceptions import AIServiceError
from app.models.comet_recommendation import CometRecommendation
from app.models.north_star import NorthStar
from app.models.selected_constellation import SelectedConstellation
from app.models.user_profile import UserProfile
from app.schemas.comet import (
    CometRecommendationAIResponse,
    CometRecommendationStatus,
)
from tests.conftest import OTHER_USER_ID, TEST_USER_ID

AI_RESPONSE = CometRecommendationAIResponse(
    target_category="가족",
    title="저녁에 20분 산책하기",
    description="오늘 저녁 가까운 곳을 천천히 20분 정도 걸어보세요.",
    reason="가족 성단의 별이 상대적으로 적습니다.",
    estimated_minutes=20,
)


def _setup_user(db_session, *, user_id: uuid.UUID = TEST_USER_ID):
    db_session.add(UserProfile(id=user_id, onboarding_completed=True))
    north_star = NorthStar(
        user_id=user_id,
        original_text="가족과 건강을 지키면서 배우고 싶다.",
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


@pytest.fixture
def setup_user(db_session):
    _setup_user(db_session)


def test_generate_recommendation_success(client, db_session, setup_user, mock_upstage_client):
    mock_upstage_client.complete_json.return_value = AI_RESPONSE
    response = client.post("/api/v1/comet-recommendations/generate")
    assert response.status_code == 200
    body = response.json()
    assert body["reused"] is False
    assert body["recommendation"]["target_category"] == "가족"


def test_generate_recommendation_reuses_pending(
    client, db_session, setup_user, mock_upstage_client
):
    mock_upstage_client.complete_json.return_value = AI_RESPONSE
    first = client.post("/api/v1/comet-recommendations/generate")
    second = client.post("/api/v1/comet-recommendations/generate")
    assert first.json()["recommendation"]["id"] == second.json()["recommendation"]["id"]
    assert second.json()["reused"] is True
    mock_upstage_client.complete_json.assert_called_once()


def test_generate_without_north_star(client, db_session):
    db_session.add(UserProfile(id=TEST_USER_ID, onboarding_completed=False))
    db_session.commit()
    response = client.post("/api/v1/comet-recommendations/generate")
    assert response.status_code == 404


def test_generate_ai_timeout(client, db_session, setup_user, mock_upstage_client):
    mock_upstage_client.complete_json.side_effect = AIServiceError()
    response = client.post("/api/v1/comet-recommendations/generate")
    assert response.status_code == 502


def test_generate_wrong_category(client, db_session, setup_user, mock_upstage_client):
    from app.core.exceptions import AIResponseInvalidError as Invalid

    mock_upstage_client.complete_json.side_effect = Invalid(
        "AI가 요청과 다른 목표 성단을 반환했습니다."
    )
    response = client.post("/api/v1/comet-recommendations/generate")
    assert response.status_code == 502


def test_get_current_without_generate(client, db_session, setup_user):
    response = client.get("/api/v1/comet-recommendations/current")
    assert response.status_code == 200
    assert response.json()["recommendation"] is None


def test_accept_recommendation(client, db_session, setup_user, mock_upstage_client):
    mock_upstage_client.complete_json.return_value = AI_RESPONSE
    recommendation_id = client.post("/api/v1/comet-recommendations/generate").json()[
        "recommendation"
    ]["id"]
    accept = client.post(f"/api/v1/comet-recommendations/{recommendation_id}/accept")
    assert accept.status_code == 200
    assert accept.json()["status"] == "PENDING"
    assert accept.json()["source_type"] == "AI_RECOMMENDATION"


def test_accept_idempotent(client, db_session, setup_user, mock_upstage_client):
    mock_upstage_client.complete_json.return_value = AI_RESPONSE
    recommendation_id = client.post("/api/v1/comet-recommendations/generate").json()[
        "recommendation"
    ]["id"]
    first = client.post(f"/api/v1/comet-recommendations/{recommendation_id}/accept")
    second = client.post(f"/api/v1/comet-recommendations/{recommendation_id}/accept")
    assert first.json()["id"] == second.json()["id"]


def test_reject_recommendation(client, db_session, setup_user, mock_upstage_client):
    mock_upstage_client.complete_json.return_value = AI_RESPONSE
    recommendation_id = client.post("/api/v1/comet-recommendations/generate").json()[
        "recommendation"
    ]["id"]
    response = client.post(f"/api/v1/comet-recommendations/{recommendation_id}/reject")
    assert response.status_code == 200
    assert db_session.get(
        CometRecommendation, uuid.UUID(recommendation_id)
    ).status == CometRecommendationStatus.REJECTED.value


def test_accept_expired_recommendation(client, db_session, setup_user):
    recommendation = CometRecommendation(
        user_id=TEST_USER_ID,
        target_category="건강",
        title="title",
        description="desc",
        reason="reason",
        estimated_minutes=10,
        status=CometRecommendationStatus.PENDING.value,
        model_name="solar-pro3",
        prompt_version="v1",
        expires_at=datetime.now(UTC) - timedelta(hours=1),
    )
    db_session.add(recommendation)
    db_session.commit()
    response = client.post(f"/api/v1/comet-recommendations/{recommendation.id}/accept")
    assert response.status_code == 422


def test_other_user_recommendation(client, db_session, setup_user, mock_upstage_client):
    mock_upstage_client.complete_json.return_value = AI_RESPONSE
    recommendation_id = client.post("/api/v1/comet-recommendations/generate").json()[
        "recommendation"
    ]["id"]

    from app.main import app
    from app.services.auth import get_current_user_id

    app.dependency_overrides[get_current_user_id] = lambda: OTHER_USER_ID
    response = client.post(f"/api/v1/comet-recommendations/{recommendation_id}/accept")
    app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
    assert response.status_code == 404
