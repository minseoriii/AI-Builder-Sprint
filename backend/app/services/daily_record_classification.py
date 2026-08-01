from app.core.constants import (
    CONSTELLATION_CATEGORIES,
    DAILY_RECORD_CLASSIFICATION_PROMPT_VERSION,
)
from app.core.exceptions import AIResponseInvalidError
from app.schemas.daily_record import DailyRecordClassificationAIResponse
from app.services.upstage import UpstageClient

DAILY_RECORD_CLASSIFICATION_SYSTEM_PROMPT = """\
당신은 사용자의 하루 기록을 16개 상위 성단 중 가장 적합한 성단으로 분류하는 AI입니다.
반드시 JSON 객체만 반환하세요. Markdown 코드 블록을 사용하지 마세요.

규칙:
- primary_category: 가장 적합한 성단 (category_ranking 첫 번째와 동일)
- category_ranking: 1~3개, 적합도 내림차순, 중복 category 금지
- score: 0~1
- evidence: 원문, 사용자 답변, 최종 태그에서 확인 가능한 표현만
- reason: 짧은 판단 근거 (단정적 성격 묘사 금지)
- 하위 태그 하나만으로 성단을 고정하지 말고 원문 전체 맥락을 종합 판단
- 허용 목록 밖 성단 사용 금지
- 존재하지 않는 사실 창작 금지

허용 상위 성단:
{categories}

반환 JSON 구조:
{{
  "primary_category": "관계·사랑",
  "category_ranking": [
    {{
      "category": "관계·사랑",
      "score": 0.91,
      "evidence": ["민서랑", "오랜만에", "편하게 얘기함"],
      "reason": "오랜만에 가까운 사람과 편안하게 대화한 관계 경험이 중심임"
    }}
  ]
}}
"""


def _build_classification_context(
    original_text: str,
    tags: dict[str, list[str]],
) -> str:
    tag_lines = []
    for dimension, values in tags.items():
        tag_lines.append(f"- {dimension}: {', '.join(values)}")
    return (
        f"하루 기록 원문:\n{original_text}\n\n"
        f"최종 태그:\n" + "\n".join(tag_lines)
    )


def validate_classification_evidence(
    ai_result: DailyRecordClassificationAIResponse,
    original_text: str,
    tags: dict[str, list[str]],
) -> None:
    allowed_sources: list[str] = [original_text]
    for values in tags.values():
        allowed_sources.extend(values)
    corpus = " ".join(allowed_sources)

    for item in ai_result.category_ranking:
        for phrase in item.evidence:
            if phrase not in corpus:
                raise ValueError(
                    f"근거 문구를 원문 또는 태그에서 확인할 수 없습니다: {phrase}"
                )


def classify_daily_record(
    original_text: str,
    tags: dict[str, list[str]],
    client: UpstageClient,
) -> DailyRecordClassificationAIResponse:
    system_prompt = DAILY_RECORD_CLASSIFICATION_SYSTEM_PROMPT.format(
        categories="\n".join(f"- {c}" for c in CONSTELLATION_CATEGORIES),
    )
    user_prompt = _build_classification_context(original_text, tags)
    ai_result = client.complete_json(
        system_prompt,
        user_prompt,
        DailyRecordClassificationAIResponse,
    )
    try:
        validate_classification_evidence(ai_result, original_text, tags)
    except ValueError as exc:
        raise AIResponseInvalidError(str(exc)) from exc
    return ai_result


def get_daily_record_classification_prompt_version() -> str:
    return DAILY_RECORD_CLASSIFICATION_PROMPT_VERSION
