import json

import pytest

from app.core.config import settings


@pytest.fixture
def demo_ui_enabled(monkeypatch):
    monkeypatch.setattr(settings, "enable_demo_ui", True)


@pytest.fixture
def demo_ui_disabled(monkeypatch):
    monkeypatch.setattr(settings, "enable_demo_ui", False)


def test_demo_page_enabled(client, demo_ui_enabled):
    response = client.get("/demo")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "IEUM 개발용 데모 UI" in response.text
    assert "/demo/static/css/demo.css" in response.text
    assert "/demo/static/js/demo.js" in response.text


def test_demo_page_disabled(client, demo_ui_disabled):
    response = client.get("/demo")
    assert response.status_code == 404


def test_demo_config_disabled(client, demo_ui_disabled):
    response = client.get("/demo/config")
    assert response.status_code == 404


def test_demo_config_no_secrets(client, demo_ui_enabled):
    response = client.get("/demo/config")
    assert response.status_code == 200
    data = response.json()

    allowed_keys = {
        "demo_enabled",
        "supabase_url",
        "supabase_publishable_key",
        "api_v1_prefix",
        "constellation_categories",
        "daily_record_dimensions",
        "dimension_labels",
        "question_presets",
        "tag_min_length",
        "tag_max_length",
        "tags_per_dimension_max",
        "tags_total_max",
        "daily_record_text_max_length",
    }
    assert set(data.keys()) == allowed_keys

    raw = json.dumps(data).lower()
    forbidden = [
        "database_url",
        "upstage_api_key",
        "service_role",
        "secret",
        "jwt",
        settings.database_url.lower() if settings.database_url else "",
        settings.upstage_api_key.lower() if settings.upstage_api_key else "",
    ]
    for token in forbidden:
        if token:
            assert token not in raw


def test_demo_static_css(client, demo_ui_enabled):
    response = client.get("/demo/static/css/demo.css")
    assert response.status_code == 200
    assert "text/css" in response.headers["content-type"]
    assert ".card" in response.text


def test_demo_static_js(client, demo_ui_enabled):
    response = client.get("/demo/static/js/demo.js")
    assert response.status_code == 200
    assert "application/javascript" in response.headers["content-type"]
    assert "apiCall" in response.text


def test_demo_static_disabled(client, demo_ui_disabled):
    response = client.get("/demo/static/css/demo.css")
    assert response.status_code == 404


def test_health_unchanged_with_demo(client, demo_ui_enabled):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_ready_unchanged_with_demo(client, demo_ui_enabled):
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    data = response.json()
    assert "database_configured" in data
    assert "upstage_configured" in data
    assert "supabase_auth_configured" in data
