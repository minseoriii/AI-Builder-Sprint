from app.core.constants import (
    CONSTELLATION_CATEGORIES,
    SEASONAL_GALAXY_REPORT_PROMPT_VERSION,
)
from app.core.exceptions import AIResponseInvalidError
from app.schemas.galaxy import SeasonalGalaxyReportAIResponse
from app.services.upstage import UpstageClient

SEASONAL_GALAXY_REPORT_SYSTEM_PROMPT = """\
당신은 사용자의 계절별 은하 관측 통계를 해석하는 AI입니다.
반드시 JSON 객체만 반환하세요. Markdown 코드 블록을 사용하지 마세요.

규칙:
- 입력 JSON의 집계 수치만 근거로 문장을 작성합니다.
- 별 개수, 비율, 태그 빈도, 월별 수치를 새로 계산하거나 변경하지 마세요.
- 통계에 없는 성단이나 태그를 만들지 마세요.
- 사용자 비난, 심리/의료 진단, 성격 단정 금지
- 각 필드는 짧고 자연스러운 한국어 문장

허용 상위 성단:
{categories}

반환 JSON 구조:
{{
  "title": "관계와 성장이 함께 빛난 여름",
  "north_star_alignment": "...",
  "dominant_category_analysis": "...",
  "record_trend_analysis": "...",
  "monthly_change_analysis": "...",
  "unobserved_area_analysis": "...",
  "closing_observation": "..."
}}
"""


def validate_report_categories(
    ai_result: SeasonalGalaxyReportAIResponse,
    allowed_categories: set[str],
) -> None:
    text = " ".join(
        [
            ai_result.title,
            ai_result.north_star_alignment,
            ai_result.dominant_category_analysis,
            ai_result.record_trend_analysis,
            ai_result.monthly_change_analysis,
            ai_result.unobserved_area_analysis,
            ai_result.closing_observation,
        ]
    )
    for category in CONSTELLATION_CATEGORIES:
        if category in text and category not in allowed_categories:
            raise AIResponseInvalidError(
                f"존재하지 않거나 통계에 없는 성단을 언급했습니다: {category}"
            )


def generate_seasonal_galaxy_report_analysis(
    stats_payload: dict,
    allowed_categories: set[str],
    client: UpstageClient,
) -> SeasonalGalaxyReportAIResponse:
    import json

    system_prompt = SEASONAL_GALAXY_REPORT_SYSTEM_PROMPT.format(
        categories="\n".join(f"- {c}" for c in CONSTELLATION_CATEGORIES),
    )
    user_prompt = (
        "다음은 백엔드가 계산한 계절 리포트 집계 JSON입니다. "
        "수치 계산 없이 해석 문장만 작성하세요.\n"
        f"{json.dumps(stats_payload, ensure_ascii=False)}"
    )
    ai_result = client.complete_json(
        system_prompt, user_prompt, SeasonalGalaxyReportAIResponse
    )
    validate_report_categories(ai_result, allowed_categories)
    return ai_result


def get_seasonal_galaxy_report_prompt_version() -> str:
    return SEASONAL_GALAXY_REPORT_PROMPT_VERSION
