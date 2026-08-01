import uuid
from datetime import UTC, date, datetime, timedelta

import pytest

from app.core.constants import QUESTION_PRESETS
from app.models.daily_record import DailyRecord
from app.models.daily_record_analysis import DailyRecordAnalysis
from app.models.north_star import NorthStar
from app.models.selected_constellation import SelectedConstellation
from app.models.star import Star
from app.models.user_profile import UserProfile
from app.schemas.daily_record import (
    DailyRecordClassificationAIResponse,
    DailyRecordExtractionAIResponse,
    DimensionExtraction,
    validate_tags_snapshot,
)
from app.services.daily_record_classification import validate_classification_evidence
from app.services.daily_record_extraction import validate_extraction_evidence
from tests.conftest import OTHER_USER_ID, TEST_USER_ID

ORIGINAL_TEXT = "민서랑 아웃백에서 치킨 먹음. 오랜만에 편하게 얘기함."
RECORDED_ON = "2026-07-31"

FULL_TAGS = {
    "PERSON": ["민서"],
    "PLACE": ["아웃백"],
    "ACTIVITY": ["치킨 먹음", "대화"],
    "TIME": ["오랜만에"],
    "EMOTION": ["편안함"],
}

PARTIAL_TAGS = {
    "PERSON": ["민서"],
    "PLACE": [],
    "ACTIVITY": ["대화"],
    "TIME": [],
    "EMOTION": ["편안함"],
}


def _full_extraction_response():
    return DailyRecordExtractionAIResponse(
        dimensions={
            "PERSON": DimensionExtraction(values=["민서"], evidence=["민서랑"]),
            "PLACE": DimensionExtraction(values=["아웃백"], evidence=["아웃백에서"]),
            "ACTIVITY": DimensionExtraction(
                values=["치킨 먹음", "대화"], evidence=["치킨 먹음", "얘기함"]
            ),
            "TIME": DimensionExtraction(values=["오랜만에"], evidence=["오랜만에"]),
            "EMOTION": DimensionExtraction(values=["편안함"], evidence=["편하게"]),
        },
        missing_dimensions=[],
    )


def _partial_extraction_response():
    return DailyRecordExtractionAIResponse(
        dimensions={
            "PERSON": DimensionExtraction(values=["민서"], evidence=["민서랑"]),
            "PLACE": DimensionExtraction(values=[], evidence=[]),
            "ACTIVITY": DimensionExtraction(values=["대화"], evidence=["얘기함"]),
            "TIME": DimensionExtraction(values=[], evidence=[]),
            "EMOTION": DimensionExtraction(values=["편안함"], evidence=["편하게"]),
        },
        missing_dimensions=["PLACE", "TIME"],
    )


def _classification_response():
    return DailyRecordClassificationAIResponse.model_validate(
        {
            "primary_category": "관계·사랑",
            "category_ranking": [
                {
                    "category": "관계·사랑",
                    "score": 0.91,
                    "evidence": ["민서랑", "오랜만에", "편하게 얘기함"],
                    "reason": "오랜만에 가까운 사람과 편안하게 대화한 관계 경험이 중심임",
                },
                {
                    "category": "소속감·공동체",
                    "score": 0.63,
                    "evidence": ["민서랑", "오랜만에"],
                    "reason": "다른 사람과 다시 연결된 경험이 일부 나타남",
                },
            ],
        }
    )


@pytest.fixture
def mock_extraction_full(mocker):
    mocker.patch(
        "app.services.daily_record.analyze_daily_record_extraction",
        return_value=(_full_extraction_response(), FULL_TAGS, []),
    )


@pytest.fixture
def mock_extraction_partial(mocker):
    mocker.patch(
        "app.services.daily_record.analyze_daily_record_extraction",
        return_value=(_partial_extraction_response(), PARTIAL_TAGS, ["PLACE", "TIME"]),
    )


@pytest.fixture
def mock_classification(mocker):
    mocker.patch(
        "app.services.daily_record.classify_daily_record",
        return_value=_classification_response(),
    )


def _setup_onboarded_user(db_session):
    profile = UserProfile(id=TEST_USER_ID, onboarding_completed=True)
    db_session.add(profile)
    north_star = NorthStar(
        user_id=TEST_USER_ID,
        original_text="가족과 건강을 지키면서 원하는 일을 꾸준히 배우고 싶다.",
        is_active=True,
    )
    db_session.add(north_star)
    db_session.flush()
    db_session.add(
        SelectedConstellation(
            north_star_id=north_star.id,
            category="가족",
            sort_order=0,
            ai_recommended=True,
            ai_score=0.9,
        )
    )
    db_session.add(
        SelectedConstellation(
            north_star_id=north_star.id,
            category="건강",
            sort_order=1,
            ai_recommended=True,
            ai_score=0.8,
        )
    )
    db_session.commit()


def test_analyze_unauthenticated(unauthenticated_client):
    response = unauthenticated_client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    assert response.status_code == 401


def test_analyze_empty_text(client):
    response = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": "   ", "recorded_on": RECORDED_ON},
    )
    assert response.status_code == 422


def test_analyze_all_dimensions(client, mock_extraction_full):
    response = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "READY_FOR_REVIEW"
    assert data["tags"] == FULL_TAGS
    assert data["missing_questions"] == []


def test_analyze_missing_dimensions(client, mock_extraction_partial):
    response = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "NEEDS_INPUT"
    assert len(data["missing_questions"]) == 2
    for item in data["missing_questions"]:
        assert item["question"] == QUESTION_PRESETS[item["dimension"]]


def test_update_details(client, mock_extraction_full, mock_classification):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]

    response = client.put(
        f"/api/v1/daily-records/analyses/{analysis_id}/details",
        json={"tags": FULL_TAGS},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "READY_FOR_CONFIRMATION"
    assert data["primary_category"] == "관계·사랑"
    assert len(data["category_ranking"]) == 2


def test_update_details_empty_dimension(client, mock_extraction_full, mock_classification):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]
    invalid_tags = dict(FULL_TAGS)
    invalid_tags["PLACE"] = []

    response = client.put(
        f"/api/v1/daily-records/analyses/{analysis_id}/details",
        json={"tags": invalid_tags},
    )
    assert response.status_code == 422


def test_update_details_duplicate_tag(client, mock_extraction_full):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]
    tags = dict(FULL_TAGS)
    tags["PERSON"] = ["민서", "민서"]

    response = client.put(
        f"/api/v1/daily-records/analyses/{analysis_id}/details",
        json={"tags": tags},
    )
    assert response.status_code == 422


def test_update_other_users_analysis(client, db_session, mock_extraction_full):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]

    from app.main import app
    from app.services.auth import get_current_user_id

    app.dependency_overrides[get_current_user_id] = lambda: OTHER_USER_ID
    try:
        response = client.put(
            f"/api/v1/daily-records/analyses/{analysis_id}/details",
            json={"tags": FULL_TAGS},
        )
        assert response.status_code == 404
    finally:
        app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID


def test_confirm_creates_record_and_star(
    client, db_session, mock_extraction_full, mock_classification
):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]
    client.put(
        f"/api/v1/daily-records/analyses/{analysis_id}/details",
        json={"tags": FULL_TAGS},
    )

    response = client.post(
        f"/api/v1/daily-records/analyses/{analysis_id}/confirm",
        json={"primary_category": "관계·사랑"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["primary_category"] == "관계·사랑"

    record_count = db_session.query(DailyRecord).count()
    star_count = db_session.query(Star).count()
    assert record_count == 1
    assert star_count == 1


def test_confirm_idempotent(client, mock_extraction_full, mock_classification):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]
    client.put(
        f"/api/v1/daily-records/analyses/{analysis_id}/details",
        json={"tags": FULL_TAGS},
    )
    first = client.post(
        f"/api/v1/daily-records/analyses/{analysis_id}/confirm",
        json={"primary_category": "관계·사랑"},
    )
    second = client.post(
        f"/api/v1/daily-records/analyses/{analysis_id}/confirm",
        json={"primary_category": "관계·사랑"},
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["daily_record_id"] == second.json()["daily_record_id"]
    assert first.json()["star_id"] == second.json()["star_id"]


def test_confirm_overridden_category(
    client, db_session, mock_extraction_full, mock_classification
):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]
    client.put(
        f"/api/v1/daily-records/analyses/{analysis_id}/details",
        json={"tags": FULL_TAGS},
    )
    response = client.post(
        f"/api/v1/daily-records/analyses/{analysis_id}/confirm",
        json={"primary_category": "즐거움·여가"},
    )
    assert response.status_code == 200
    record = db_session.query(DailyRecord).one()
    assert record.primary_category == "즐거움·여가"
    assert record.ai_primary_category == "관계·사랑"
    assert record.category_overridden is True


def test_confirm_not_ready(client, mock_extraction_full):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]

    response = client.post(
        f"/api/v1/daily-records/analyses/{analysis_id}/confirm",
        json={"primary_category": "관계·사랑"},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ANALYSIS_NOT_READY"


def test_confirm_expired_analysis(
    client, db_session, mock_extraction_full, mock_classification
):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = uuid.UUID(analyze.json()["analysis_id"])
    client.put(
        f"/api/v1/daily-records/analyses/{analysis_id}/details",
        json={"tags": FULL_TAGS},
    )
    analysis = db_session.get(DailyRecordAnalysis, analysis_id)
    analysis.expires_at = datetime.now(UTC) - timedelta(hours=1)
    db_session.commit()

    response = client.post(
        f"/api/v1/daily-records/analyses/{analysis_id}/confirm",
        json={"primary_category": "관계·사랑"},
    )
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "ANALYSIS_EXPIRED"


def test_get_daily_record(client, mock_extraction_full, mock_classification):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]
    client.put(
        f"/api/v1/daily-records/analyses/{analysis_id}/details",
        json={"tags": FULL_TAGS},
    )
    confirm = client.post(
        f"/api/v1/daily-records/analyses/{analysis_id}/confirm",
        json={"primary_category": "관계·사랑"},
    )
    record_id = confirm.json()["daily_record_id"]

    response = client.get(f"/api/v1/daily-records/{record_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["original_text"] == ORIGINAL_TEXT
    assert data["primary_category"] == "관계·사랑"
    assert data["tags"]["PERSON"] == ["민서"]


def test_get_daily_record_other_user(client, mock_extraction_full, mock_classification):
    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]
    client.put(
        f"/api/v1/daily-records/analyses/{analysis_id}/details",
        json={"tags": FULL_TAGS},
    )
    confirm = client.post(
        f"/api/v1/daily-records/analyses/{analysis_id}/confirm",
        json={"primary_category": "관계·사랑"},
    )
    record_id = confirm.json()["daily_record_id"]

    from app.main import app
    from app.services.auth import get_current_user_id

    app.dependency_overrides[get_current_user_id] = lambda: OTHER_USER_ID
    try:
        response = client.get(f"/api/v1/daily-records/{record_id}")
        assert response.status_code == 404
    finally:
        app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID


def test_validate_tags_snapshot_rejects_blank():
    with pytest.raises(ValueError):
        validate_tags_snapshot(
            {
                "PERSON": [" "],
                "PLACE": ["아웃백"],
                "ACTIVITY": ["대화"],
                "TIME": ["오늜만에"],
                "EMOTION": ["편안함"],
            }
        )


def test_extraction_evidence_must_be_in_original():
    ai_result = _full_extraction_response()
    validate_extraction_evidence(ai_result, ORIGINAL_TEXT)
    bad = ai_result.model_copy(deep=True)
    bad.dimensions["PERSON"].evidence = ["없는구절"]
    with pytest.raises(ValueError):
        validate_extraction_evidence(bad, ORIGINAL_TEXT)


def test_classification_allows_unselected_north_star_category():
    result = _classification_response()
    validate_classification_evidence(result, ORIGINAL_TEXT, FULL_TAGS)
    assert result.primary_category == "관계·사랑"


def test_extraction_ai_invalid_dimension():
    with pytest.raises(ValueError):
        DailyRecordExtractionAIResponse(
            dimensions={
                "PERSON": DimensionExtraction(values=["민서"], evidence=["민서랑"]),
                "PLACE": DimensionExtraction(values=["아웃백"], evidence=["아웃백에서"]),
                "ACTIVITY": DimensionExtraction(values=["대화"], evidence=["얘기함"]),
                "TIME": DimensionExtraction(values=["오랜만에"], evidence=["오랜만에"]),
                "WRONG": DimensionExtraction(values=["x"], evidence=["x"]),
            },
            missing_dimensions=[],
        )


def test_classification_invalid_category():
    with pytest.raises(ValueError):
        DailyRecordClassificationAIResponse.model_validate(
            {
                "primary_category": "없는성단",
                "category_ranking": [
                    {
                        "category": "없는성단",
                        "score": 0.9,
                        "evidence": ["민서랑"],
                        "reason": "test",
                    }
                ],
            }
        )


def test_solar_timeout_on_analyze(client, mock_upstage_client):
    from app.core.exceptions import AIServiceError

    mock_upstage_client.complete_json.side_effect = AIServiceError()
    response = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    assert response.status_code == 502


def test_home_unauthenticated(unauthenticated_client):
    response = unauthenticated_client.get("/api/v1/home")
    assert response.status_code == 401


def test_home_onboarded_user(client, db_session, mock_extraction_full, mock_classification):
    _setup_onboarded_user(db_session)

    analyze = client.post(
        "/api/v1/daily-records/analyze",
        json={"text": ORIGINAL_TEXT, "recorded_on": RECORDED_ON},
    )
    analysis_id = analyze.json()["analysis_id"]
    client.put(
        f"/api/v1/daily-records/analyses/{analysis_id}/details",
        json={"tags": FULL_TAGS},
    )
    client.post(
        f"/api/v1/daily-records/analyses/{analysis_id}/confirm",
        json={"primary_category": "관계·사랑"},
    )

    response = client.get("/api/v1/home")
    assert response.status_code == 200
    data = response.json()
    assert "selected_categories" not in str(data)
    assert data["north_star_text"] == "가족과 건강을 지키면서 원하는 일을 꾸준히 배우고 싶다."
    assert data["total_star_count"] == 1
    assert data["today_recorded"] is True

    categories = {item["category"]: item for item in data["constellations"]}
    assert "가족" in categories
    assert "건강" in categories
    assert "관계·사랑" in categories
    assert categories["가족"]["selected_from_north_star"] is True
    assert categories["관계·사랑"]["selected_from_north_star"] is False
    assert categories["건강"]["star_count"] == 0


def test_home_other_user_stars_not_mixed(client, db_session):
    _setup_onboarded_user(db_session)

    other_profile = UserProfile(id=OTHER_USER_ID, onboarding_completed=True)
    db_session.add(other_profile)
    db_session.add(
        Star(
            user_id=OTHER_USER_ID,
            source_type="DAILY_RECORD",
            source_id=uuid.uuid4(),
            category="모험·도전",
            recorded_on=date(2026, 7, 30),
            preview="다른 사용자 기록",
        )
    )
    db_session.commit()

    response = client.get("/api/v1/home")
    assert response.status_code == 200
    categories = [item["category"] for item in response.json()["constellations"]]
    assert "모험·도전" not in categories
