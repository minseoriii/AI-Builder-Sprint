from app.core.constants import (
    CONSTELLATION_CATEGORIES,
    NORTH_STAR_ANALYSIS_PROMPT_VERSION,
)
from app.core.exceptions import AIResponseInvalidError
from app.schemas.onboarding import NorthStarAnalysisAIResponse
from app.services.upstage import UpstageClient

NORTH_STAR_CONSTELLATION_SYSTEM_PROMPT = """\
당신은 사용자의 북극성 지표 문장을 분석하는 AI입니다.
반드시 JSON 객체만 반환하세요. Markdown 코드 블록을 사용하지 마세요.

규칙:
- candidates: 정확히 7개
- category: 아래 허용 목록 중 하나만 사용 (새 이름 생성 금지)
- score: 0~1, 내림차순 정렬
- recommended: true인 후보는 1~3개
- evidence: 사용자 원문에 실제로 포함된 짧은 구절만
- reason: category 선택 근거 (단정적 성격 묘사 금지)
- 중복 category 금지
- 사용자 문장에 없는 사실 창작 금지

허용 상위 성단:
{categories}

반환 JSON 구조:
{{
  "candidates": [
    {{
      "category": "가족",
      "score": 0.94,
      "recommended": true,
      "evidence": ["가족과", "지키면서"],
      "reason": "가족 관계와 돌봄을 중요하게 표현함"
    }}
  ]
}}
"""


def validate_evidence_in_original(
    ai_result: NorthStarAnalysisAIResponse,
    original_text: str,
) -> None:
    for candidate in ai_result.candidates:
        for phrase in candidate.evidence:
            if phrase not in original_text:
                raise ValueError(
                    f"근거 문구가 원문에 포함되어 있지 않습니다: {phrase}"
                )


def analyze_north_star_constellations(
    text: str,
    client: UpstageClient,
) -> NorthStarAnalysisAIResponse:
    system_prompt = NORTH_STAR_CONSTELLATION_SYSTEM_PROMPT.format(
        categories="\n".join(f"- {c}" for c in CONSTELLATION_CATEGORIES),
    )
    user_prompt = f"북극성 지표 원문:\n{text}"
    ai_result = client.complete_json(system_prompt, user_prompt, NorthStarAnalysisAIResponse)
    try:
        validate_evidence_in_original(ai_result, text)
    except ValueError as exc:
        raise AIResponseInvalidError(str(exc)) from exc
    return ai_result


def get_north_star_analysis_prompt_version() -> str:
    return NORTH_STAR_ANALYSIS_PROMPT_VERSION
