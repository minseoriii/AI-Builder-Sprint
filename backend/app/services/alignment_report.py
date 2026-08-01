from app.core.constants import ALIGNMENT_REPORT_PROMPT_VERSION
from app.schemas.alignment_report import AlignmentNarrativeAIResponse
from app.services.upstage import UpstageClient

ALIGNMENT_REPORT_SYSTEM_PROMPT = """\
당신은 사용자의 최근 기록 정렬 통계를 설명하는 AI입니다.
반드시 JSON 객체만 반환하세요. Markdown 코드 블록을 사용하지 마세요.

규칙:
- 백엔드가 제공한 숫자를 변경하거나 새 숫자를 만들지 마세요
- 객관적인 심리 검사처럼 표현하지 마세요
- 실제 삶 전체가 아니라 최근 기록만 분석한다고 명시하세요
- 기록이 적으면(data_sufficiency가 low) 잠정적인 관찰이라고 명시하세요
- 부정적 평가나 훈계 금지
- 대표 기록에 없는 사실 생성 금지
- 정렬 점수를 새로 생성하지 마세요
- aligned_record_rate는 백엔드가 계산한 값만 사용하세요
- "부족한 가치", "실천하지 못한 가치", "실패한 가치", "결핍된 가치" 표현 금지
- 덜 나타난 가치는 "최근 기록에서 덜 나타난 가치"로 표현하세요

반환 JSON 구조:
{{
  "summary": "...",
  "well_observed_values": [{{"tag": "...", "explanation": "..."}}],
  "less_observed_values": [{{"tag": "...", "explanation": "..."}}],
  "reflection_question": "...",
  "data_note": (
      "이 결과는 최근 작성된 기록만을 바탕으로 한 관찰이며 "
      "실제 삶 전체를 평가하지 않습니다."
  )
}}
"""


def generate_alignment_narrative(
    report_context: str,
    client: UpstageClient,
) -> AlignmentNarrativeAIResponse:
    user_prompt = f"다음 통계를 바탕으로 정렬 리포트를 작성하세요:\n\n{report_context}"
    return client.complete_json(
        ALIGNMENT_REPORT_SYSTEM_PROMPT,
        user_prompt,
        AlignmentNarrativeAIResponse,
    )


def get_alignment_report_prompt_version() -> str:
    return ALIGNMENT_REPORT_PROMPT_VERSION
