import pytest
from openai import APIConnectionError

from app.core.exceptions import AIServiceError
from app.schemas.onboarding import NorthStarAnalysisAIResponse
from app.services.upstage import UpstageClient


def test_upstage_service_error(mocker):
    mocker.patch("app.services.upstage.settings.upstage_api_key", "test-key")
    mock_openai = mocker.patch("app.services.upstage.OpenAI")
    mock_instance = mock_openai.return_value
    mock_instance.chat.completions.create.side_effect = APIConnectionError(request=mocker.Mock())

    client = UpstageClient()

    with pytest.raises(AIServiceError):
        client.complete_json("system", "user", NorthStarAnalysisAIResponse)
