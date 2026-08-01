import uuid

from app.models.comet import Comet
from app.models.star import Star
from app.models.user_profile import UserProfile
from app.schemas.comet import CometRecordStatus, CometStatus
from app.schemas.daily_record import StarSourceType
from tests.conftest import OTHER_USER_ID, TEST_USER_ID


def _setup_user(db_session):
    db_session.add(UserProfile(id=TEST_USER_ID, onboarding_completed=True))
    db_session.commit()


def test_create_comet(client, db_session):
    _setup_user(db_session)
    response = client.post(
        "/api/v1/comets",
        json={
            "title": "부모님께 안부 전화하기",
            "target_category": "가족",
            "description": "오늘 저녁에 전화한다.",
            "target_completion_date": "2026-08-05",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["source_type"] == "USER_CREATED"
    assert body["status"] == "PENDING"
    assert body["reason"] is None
    assert body["target_completion_date"] == "2026-08-05"


def test_create_comet_blank_title(client, db_session):
    _setup_user(db_session)
    response = client.post(
        "/api/v1/comets",
        json={"title": "   ", "target_category": "가족"},
    )
    assert response.status_code == 422


def test_create_comet_invalid_category(client, db_session):
    _setup_user(db_session)
    response = client.post(
        "/api/v1/comets",
        json={"title": "test", "target_category": "invalid"},
    )
    assert response.status_code == 422


def test_list_comets_filter(client, db_session):
    _setup_user(db_session)
    client.post(
        "/api/v1/comets",
        json={"title": "pending comet", "target_category": "건강"},
    )
    response = client.get("/api/v1/comets", params={"status": "PENDING"})
    assert response.status_code == 200
    assert len(response.json()["items"]) == 1


def test_update_pending_comet(client, db_session):
    _setup_user(db_session)
    comet_id = client.post(
        "/api/v1/comets",
        json={"title": "old title", "target_category": "건강"},
    ).json()["id"]
    response = client.put(
        f"/api/v1/comets/{comet_id}",
        json={
            "title": "new title",
            "description": "updated",
            "target_completion_date": "2026-08-10",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "new title"
    assert body["description"] == "updated"
    assert body["target_completion_date"] == "2026-08-10"


def test_delete_pending_comet(client, db_session):
    _setup_user(db_session)
    comet_id = client.post(
        "/api/v1/comets",
        json={"title": "delete me", "target_category": "건강"},
    ).json()["id"]
    response = client.delete(f"/api/v1/comets/{comet_id}")
    assert response.status_code == 204
    assert client.get("/api/v1/comets").json()["items"] == []


def test_cancel_comet(client, db_session):
    _setup_user(db_session)
    comet_id = client.post(
        "/api/v1/comets",
        json={"title": "cancel me", "target_category": "건강"},
    ).json()["id"]
    response = client.post(f"/api/v1/comets/{comet_id}/cancel")
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELLED"


def test_complete_comet_creates_observation_record(client, db_session):
    _setup_user(db_session)
    comet_id = client.post(
        "/api/v1/comets",
        json={"title": "20분 산책", "target_category": "건강"},
    ).json()["id"]
    response = client.post(
        f"/api/v1/comets/{comet_id}/complete",
        json={
            "completed_on": "2026-07-31",
            "activity_summary": "저녁에 동네 공원을 20분 걸었다.",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["record_status"] == "RECORDED"
    assert body["activity_summary"] == "저녁에 동네 공원을 20분 걸었다."
    assert db_session.query(Star).count() == 0


def test_create_star_from_completed_comet(client, db_session):
    _setup_user(db_session)
    comet_id = client.post(
        "/api/v1/comets",
        json={"title": "20분 산책", "target_category": "건강"},
    ).json()["id"]
    client.post(
        f"/api/v1/comets/{comet_id}/complete",
        json={"activity_summary": "저녁에 동네 공원을 20분 걸었다."},
    )
    response = client.post(f"/api/v1/comets/{comet_id}/create-star")
    assert response.status_code == 200
    body = response.json()
    assert body["record_status"] == "STAR_CREATED"
    star = db_session.get(Star, uuid.UUID(body["star_id"]))
    assert star.source_type == StarSourceType.COMET.value
    assert star.category == "건강"


def test_complete_comet_idempotent(client, db_session):
    _setup_user(db_session)
    comet_id = client.post(
        "/api/v1/comets",
        json={"title": "20분 산책", "target_category": "건강"},
    ).json()["id"]
    payload = {"activity_summary": "산책 완료"}
    first = client.post(f"/api/v1/comets/{comet_id}/complete", json=payload)
    second = client.post(f"/api/v1/comets/{comet_id}/complete", json=payload)
    assert first.json()["comet_id"] == second.json()["comet_id"]


def test_create_star_idempotent(client, db_session):
    _setup_user(db_session)
    comet_id = client.post(
        "/api/v1/comets",
        json={"title": "20분 산책", "target_category": "건강"},
    ).json()["id"]
    client.post(
        f"/api/v1/comets/{comet_id}/complete",
        json={"activity_summary": "산책 완료"},
    )
    first = client.post(f"/api/v1/comets/{comet_id}/create-star")
    second = client.post(f"/api/v1/comets/{comet_id}/create-star")
    assert first.json()["star_id"] == second.json()["star_id"]


def test_completed_comet_list_includes_record_status(client, db_session):
    _setup_user(db_session)
    comet_id = client.post(
        "/api/v1/comets",
        json={"title": "20분 산책", "target_category": "건강"},
    ).json()["id"]
    client.post(
        f"/api/v1/comets/{comet_id}/complete",
        json={"activity_summary": "산책 완료"},
    )
    response = client.get("/api/v1/comets", params={"status": "COMPLETED"})
    item = response.json()["items"][0]
    assert item["record_status"] == CometRecordStatus.RECORDED.value
    assert item["star_id"] is None
    assert item["activity_summary"] == "산책 완료"


def test_complete_cancelled_comet_fails(client, db_session):
    _setup_user(db_session)
    comet_id = client.post(
        "/api/v1/comets",
        json={"title": "cancel", "target_category": "건강"},
    ).json()["id"]
    client.post(f"/api/v1/comets/{comet_id}/cancel")
    response = client.post(
        f"/api/v1/comets/{comet_id}/complete",
        json={"activity_summary": "too late"},
    )
    assert response.status_code == 422


def test_other_user_comet_forbidden(client, db_session):
    _setup_user(db_session)
    comet = Comet(
        user_id=OTHER_USER_ID,
        source_type="USER_CREATED",
        target_category="건강",
        title="other",
        status=CometStatus.PENDING.value,
    )
    db_session.add(comet)
    db_session.commit()
    response = client.post(
        f"/api/v1/comets/{comet.id}/complete",
        json={"activity_summary": "nope"},
    )
    assert response.status_code == 404
