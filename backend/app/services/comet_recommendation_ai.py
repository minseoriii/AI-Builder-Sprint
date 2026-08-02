from app.core.constants import (
    COMET_RECOMMENDATION_PROMPT_VERSION,
    CONSTELLATION_CATEGORIES,
)
from app.core.exceptions import AIResponseInvalidError
from app.schemas.comet import CometRecommendationAIResponse
from app.services.upstage import UpstageClient

COMET_RECOMMENDATION_SYSTEM_PROMPT = """\
당신은 사용자의 북극성 성단을 보완하기 위한 작은 행동을 추천하는 AI입니다.
반드시 JSON 객체만 반환하세요. Markdown 코드 블록을 사용하지 마세요.

규칙:
- target_category는 반드시 요청된 성단과 동일해야 합니다.
- title: 한 번 수행 가능한 구체적 행동 (1~100자)
- description: 짧은 실행 안내
- reason: 왜 이 성단을 추천하는지 (사용자 비난 금지)
- estimated_minutes: 5~60 정수
- 불법, 위험, 의료 판단, 고비용 활동 추천 금지
- 거창한 목표나 추상적 표현 금지
- 허용 상위 성단 외 값 사용 금지

허용 상위 성단:
{categories}

반환 JSON 구조:
{{
  "target_category": "건강",
  "title": "저녁에 20분 산책하기",
  "description": "오늘 저녁 가까운 곳을 20분 정도 걸어보세요.",
  "reason": "북극성에서 중요하게 선택한 건강 성단의 별이 상대적으로 적기 때문입니다.",
  "estimated_minutes": 20
}}
"""


def generate_comet_recommendation(
    *,
    target_category: str,
    north_star_text: str,
    star_counts: dict[str, int],
    client: UpstageClient,
) -> CometRecommendationAIResponse:
    system_prompt = COMET_RECOMMENDATION_SYSTEM_PROMPT.format(
        categories="\n".join(f"- {c}" for c in CONSTELLATION_CATEGORIES),
    )
    counts_text = "\n".join(
        f"- {category}: {star_counts.get(category, 0)}개"
        for category in sorted(star_counts.keys())
    )
    user_prompt = (
        f"목표 성단: {target_category}\n"
        f"북극성 원문: {north_star_text}\n"
        f"활성 성단별 별 개수:\n{counts_text}\n"
        f"위 목표 성단({target_category})을 위한 구체적인 행동 하나를 추천하세요."
    )
    ai_result = client.complete_json(
        system_prompt, user_prompt, CometRecommendationAIResponse
    )
    if ai_result.target_category != target_category:
        raise AIResponseInvalidError(
            "AI가 요청과 다른 목표 성단을 반환했습니다."
        )
    return ai_result


def get_comet_recommendation_prompt_version() -> str:
    return COMET_RECOMMENDATION_PROMPT_VERSION
