import httpx
import pytest

from app.core.exceptions import AuthServiceUnavailableError
from app.services.auth import verify_supabase_token


def test_auth_token_missing(unauthenticated_client):
    response = unauthenticated_client.get("/api/v1/me/onboarding")
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "AUTH_TOKEN_MISSING"


def test_auth_token_invalid_format(unauthenticated_client):
    response = unauthenticated_client.get(
        "/api/v1/me/onboarding",
        headers={"Authorization": "InvalidFormat"},
    )
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "AUTH_TOKEN_INVALID"


def test_supabase_auth_unavailable(mocker):
    mocker.patch("app.services.auth.settings.supabase_url", "https://example.supabase.co")
    mocker.patch("app.services.auth.settings.supabase_publishable_key", "test-key")

    mock_client = mocker.Mock()
    mock_client.get.side_effect = httpx.RequestError("connection failed")
    mock_context = mocker.Mock()
    mock_context.__enter__ = mocker.Mock(return_value=mock_client)
    mock_context.__exit__ = mocker.Mock(return_value=False)
    mocker.patch("app.services.auth.httpx.Client", return_value=mock_context)

    with pytest.raises(AuthServiceUnavailableError):
        verify_supabase_token("fake-token")


def test_profile_created_on_first_request(client, db_session):
    response = client.get("/api/v1/me/onboarding")
    assert response.status_code == 200
    from app.models.user_profile import UserProfile
    from tests.conftest import TEST_USER_ID

    profile = db_session.get(UserProfile, TEST_USER_ID)
    assert profile is not None
