from app.core.constants import (
    DAILY_RECORD_DIMENSIONS,
    DAILY_RECORD_EXTRACTION_PROMPT_VERSION,
)
from app.core.exceptions import AIResponseInvalidError
from app.schemas.daily_record import (
    DailyRecordExtractionAIResponse,
)
from app.services.upstage import UpstageClient

DAILY_RECORD_EXTRACTION_SYSTEM_PROMPT = """\
당신은 사용자의 하루 기록 원문에서 다섯 가지 차원의 정보를 추출하는 AI입니다.
반드시 JSON 객체만 반환하세요. Markdown 코드 블록을 사용하지 마세요.

규칙:
- dimensions: PERSON, PLACE, ACTIVITY, TIME, EMOTION 다섯 키 모두 포함
- 각 차원의 values: 원문에 있는 구체적 표현 (과도한 일반화 금지)
- 각 차원의 evidence: 원문에서 직접 확인 가능한 짧은 구절
- 값이 없는 차원은 values: [] 로 두고 missing_dimensions에 포함
- missing_dimensions: 값이 없거나 불명확한 차원 식별자만 (질문 문장 생성 금지)
- 원문에 없는 사실 창작 금지
- 중복 값 금지

반환 JSON 구조:
{{
  "dimensions": {{
    "PERSON": {{"values": ["민서"], "evidence": ["민서랑"]}},
    "PLACE": {{"values": ["아웃백"], "evidence": ["아웃백에서"]}},
    "ACTIVITY": {{"values": ["치킨 먹음", "대화"], "evidence": ["치킨 먹음", "얘기함"]}},
    "TIME": {{"values": ["오랜만에"], "evidence": ["오랜만에"]}},
    "EMOTION": {{"values": ["편안함"], "evidence": ["편하게"]}}
  }},
  "missing_dimensions": []
}}
"""


def _extract_tags_from_ai(ai_result: DailyRecordExtractionAIResponse) -> dict[str, list[str]]:
    tags: dict[str, list[str]] = {}
    for dimension in DAILY_RECORD_DIMENSIONS:
        tags[dimension] = list(ai_result.dimensions[dimension].values)
    return tags


def _find_missing_dimensions(
    ai_result: DailyRecordExtractionAIResponse,
) -> list[str]:
    missing: list[str] = []
    for dimension in DAILY_RECORD_DIMENSIONS:
        values = ai_result.dimensions[dimension].values
        if not values or dimension in ai_result.missing_dimensions:
            if dimension not in missing:
                missing.append(dimension)
    for dimension in ai_result.missing_dimensions:
        if dimension not in missing:
            missing.append(dimension)
    return missing


def validate_extraction_evidence(
    ai_result: DailyRecordExtractionAIResponse,
    original_text: str,
) -> None:
    for dimension in DAILY_RECORD_DIMENSIONS:
        extraction = ai_result.dimensions[dimension]
        for phrase in extraction.evidence:
            if phrase not in original_text:
                raise ValueError(
                    f"근거 문구가 원문에 포함되어 있지 않습니다: {phrase}"
                )


def analyze_daily_record_extraction(
    text: str,
    client: UpstageClient,
) -> tuple[DailyRecordExtractionAIResponse, dict[str, list[str]], list[str]]:
    user_prompt = f"하루 기록 원문:\n{text}"
    ai_result = client.complete_json(
        DAILY_RECORD_EXTRACTION_SYSTEM_PROMPT,
        user_prompt,
        DailyRecordExtractionAIResponse,
    )
    try:
        validate_extraction_evidence(ai_result, text)
    except ValueError as exc:
        raise AIResponseInvalidError(str(exc)) from exc

    tags = _extract_tags_from_ai(ai_result)
    missing = _find_missing_dimensions(ai_result)
    return ai_result, tags, missing


def get_daily_record_extraction_prompt_version() -> str:
    return DAILY_RECORD_EXTRACTION_PROMPT_VERSION
