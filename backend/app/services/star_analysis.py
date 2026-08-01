from app.core.constants import (
    CORE_VALUE_TAGS,
    LIFE_DOMAIN_TAGS,
    SENSORY_TAGS,
    STAR_ENTRY_PROMPT_VERSION,
)
from app.schemas.star_entry import StarEntryAIResponse
from app.services.upstage import UpstageClient

STAR_ENTRY_SYSTEM_PROMPT = """\
당신은 사용자의 감각 별 기록을 분류하는 AI입니다.
반드시 JSON 객체만 반환하세요. Markdown 코드 블록을 사용하지 마세요.

규칙:
- life_domains: 1~3개, 허용 목록 중에서만 선택
- related_values: 0~4개, tag는 허용 핵심 가치 목록 중 하나, strength는 1~3
- evidence는 반드시 사용자 원문에 포함된 짧은 구절이어야 함
- sensory_tags: 명시적 또는 강하게 암시된 경우에만 선택, 없으면 빈 배열
- confidence: 0~1
- companion_type은 출력하지 마세요

허용 핵심 가치: {core_values}
허용 생활 영역: {life_domains}
허용 감각 태그: {sensory_tags}

반환 JSON 구조:
{{
  "life_domains": ["..."],
  "related_values": [{{"tag": "...", "strength": 3, "evidence": "..."}}],
  "sensory_tags": ["..."],
  "confidence": 0.91
}}
"""


def analyze_star_entry(
    content: str,
    north_star_core_values: list[dict],
    client: UpstageClient,
) -> StarEntryAIResponse:
    ns_tags = ", ".join(cv["tag"] for cv in north_star_core_values) or "없음"
    system_prompt = STAR_ENTRY_SYSTEM_PROMPT.format(
        core_values=", ".join(CORE_VALUE_TAGS),
        life_domains=", ".join(LIFE_DOMAIN_TAGS),
        sensory_tags=", ".join(SENSORY_TAGS),
    )
    user_prompt = (
        f"기록 원문:\n{content}\n\n"
        f"사용자 북극성 핵심 가치: {ns_tags}"
    )
    return client.complete_json(system_prompt, user_prompt, StarEntryAIResponse)


def get_star_entry_prompt_version() -> str:
    return STAR_ENTRY_PROMPT_VERSION
