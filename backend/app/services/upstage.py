import json
import re
from typing import TypeVar

from openai import APIConnectionError, APIStatusError, OpenAI
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.core.exceptions import AIResponseInvalidError, AIServiceError

T = TypeVar("T", bound=BaseModel)

_CODE_BLOCK_PATTERN = re.compile(r"^```(?:json)?\s*\n?(.*?)\n?```$", re.DOTALL | re.IGNORECASE)


def strip_markdown_code_block(text: str) -> str:
    stripped = text.strip()
    match = _CODE_BLOCK_PATTERN.match(stripped)
    if match:
        return match.group(1).strip()
    if stripped.startswith("```"):
        lines = stripped.split("\n")
        if len(lines) >= 2 and lines[-1].strip() == "```":
            return "\n".join(lines[1:-1]).strip()
    return stripped


def parse_json_content(content: str) -> dict:
    cleaned = strip_markdown_code_block(content)
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise AIResponseInvalidError("AI 응답 JSON 파싱에 실패했습니다.") from exc
    if not isinstance(parsed, dict):
        raise AIResponseInvalidError("AI 응답은 JSON 객체여야 합니다.")
    return parsed


def validate_ai_response(content: str, schema: type[T]) -> T:
    data = parse_json_content(content)
    try:
        return schema.model_validate(data)
    except ValidationError as exc:
        raise AIResponseInvalidError(str(exc)) from exc


class UpstageClient:
    def __init__(self) -> None:
        self.model = settings.upstage_model
        self.timeout = settings.ai_timeout_seconds
        self._client: OpenAI | None = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            if not settings.upstage_configured:
                raise AIServiceError("Upstage API 키가 설정되지 않았습니다.")
            self._client = OpenAI(
                api_key=settings.upstage_api_key,
                base_url=settings.upstage_base_url,
            )
        return self._client

    def _chat(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        previous_response: str | None = None,
        retry_hint: str | None = None,
    ) -> str:
        if not settings.upstage_configured:
            raise AIServiceError("Upstage API 키가 설정되지 않았습니다.")

        messages: list[dict[str, str]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        if previous_response and retry_hint:
            messages.append({"role": "assistant", "content": previous_response})
            messages.append({"role": "user", "content": retry_hint})

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                timeout=self.timeout,
                max_tokens=4096,
            )
        except APIConnectionError as exc:
            raise AIServiceError() from exc
        except APIStatusError as exc:
            raise AIServiceError() from exc

        choice = response.choices[0].message.content
        if not choice:
            raise AIResponseInvalidError("AI 응답이 비어 있습니다.")
        return choice

    def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[T],
    ) -> T:
        content = self._chat(system_prompt, user_prompt)
        try:
            return validate_ai_response(content, schema)
        except AIResponseInvalidError as exc:
            retry_hint = (
                "이전 응답 형식이 올바르지 않습니다. "
                f"오류: {exc}. "
                "candidates는 정확히 7개여야 하며 score는 내림차순, "
                "recommended true는 1~3개입니다. "
                "Markdown 코드 블록 없이 순수 JSON만 출력하세요."
            )
            retry_content = self._chat(
                system_prompt,
                user_prompt,
                previous_response=content,
                retry_hint=retry_hint,
            )
            try:
                return validate_ai_response(retry_content, schema)
            except AIResponseInvalidError as exc:
                raise AIResponseInvalidError(
                    "AI 분석 결과를 처리하지 못했습니다."
                ) from exc


def get_upstage_client() -> UpstageClient:
    return UpstageClient()
