from app.core.constants import (
    CONSTELLATION_CATEGORIES,
    GALAXY_OVERVIEW_SUMMARY_PROMPT_VERSION,
)
from app.core.exceptions import AIResponseInvalidError
from app.schemas.galaxy import GalaxyOverviewSummaryAIResponse
from app.services.upstage import UpstageClient

GALAXY_OVERVIEW_SUMMARY_SYSTEM_PROMPT = """\
당신은 사용자의 은하 관측 통계를 바탕으로 짧은 세 줄 요약을 작성하는 AI입니다.
반드시 JSON 객체만 반환하세요. Markdown 코드 블록을 사용하지 마세요.

규칙:
- lines: 정확히 3개의 짧은 문장
- 입력 통계와 모순되는 숫자나 성단 언급 금지
- 허용 상위 성단 외 이름 사용 금지
- 사용자 비난, 심리/의료 진단 금지
- 각 문장은 간결하게

허용 상위 성단:
{categories}

반환 JSON 구조:
{{
  "lines": [
    "첫 번째 문장",
    "두 번째 문장",
    "세 번째 문장"
  ]
}}
"""


def validate_summary_categories(
    ai_result: GalaxyOverviewSummaryAIResponse,
    allowed_categories: set[str],
) -> None:
    for line in ai_result.lines:
        for category in CONSTELLATION_CATEGORIES:
            if category in line and category not in allowed_categories:
                raise AIResponseInvalidError(
                    f"존재하지 않거나 통계에 없는 성단을 언급했습니다: {category}"
                )


def generate_galaxy_overview_summary(
    stats_payload: dict,
    allowed_categories: set[str],
    client: UpstageClient,
) -> GalaxyOverviewSummaryAIResponse:
    import json

    system_prompt = GALAXY_OVERVIEW_SUMMARY_SYSTEM_PROMPT.format(
        categories="\n".join(f"- {c}" for c in CONSTELLATION_CATEGORIES),
    )
    user_prompt = (
        "다음은 백엔드가 계산한 확정 통계입니다. "
        "이 수치만 근거로 세 줄 요약을 작성하세요.\n"
        f"{json.dumps(stats_payload, ensure_ascii=False)}"
    )
    ai_result = client.complete_json(
        system_prompt, user_prompt, GalaxyOverviewSummaryAIResponse
    )
    validate_summary_categories(ai_result, allowed_categories)
    return ai_result


def get_galaxy_overview_summary_prompt_version() -> str:
    return GALAXY_OVERVIEW_SUMMARY_PROMPT_VERSION
