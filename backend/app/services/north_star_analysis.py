from pydantic import ValidationError

from app.core.constants import (
    CONSTELLATION_CATEGORIES,
    NORTH_STAR_ANALYSIS_PROMPT_VERSION,
)
from app.core.exceptions import AIResponseInvalidError
from app.schemas.onboarding import ConstellationCandidate, NorthStarAnalysisAIResponse
from app.services.upstage import UpstageClient, parse_json_content

NORTH_STAR_CONSTELLATION_SYSTEM_PROMPT = """\
당신은 사용자의 북극성 지표 문장을 분석하는 AI입니다.
반드시 JSON 객체만 반환하세요. Markdown 코드 블록을 사용하지 마세요.

규칙:
- candidates 배열은 반드시 정확히 7개 (7개 미만·초과 금지)
- category: 아래 허용 목록 중 하나만 사용 (새 이름 생성 금지)
- score: 0~1, 내림차순 정렬
- recommended: true인 후보는 1~3개
- evidence: 사용자 원문에 실제로 포함된 짧은 구절만
- reason: category 선택 근거 (단정적 성격 묘사 금지)
- 중복 category 금지
- 사용자 문장에 없는 사실 창작 금지

허용 상위 성단:
{categories}

반환 JSON 구조 (candidates는 7개):
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


def _collect_evidence_phrases(original_text: str) -> list[str]:
    phrases: list[str] = []
    seen: set[str] = set()

    for token in original_text.split():
        cleaned = token.strip()
        if cleaned and cleaned not in seen:
            phrases.append(cleaned)
            seen.add(cleaned)

    for size in range(min(4, len(original_text)), 0, -1):
        chunk = original_text[:size]
        if chunk and chunk not in seen:
            phrases.append(chunk)
            seen.add(chunk)

    return phrases or [original_text]


def _pad_candidates_to_seven(
    partial: list[ConstellationCandidate],
    original_text: str,
) -> list[ConstellationCandidate]:
    if len(partial) >= 7:
        return sorted(partial, key=lambda item: item.score, reverse=True)[:7]

    used = {item.category for item in partial}
    evidence_phrases = _collect_evidence_phrases(original_text)
    min_score = min(item.score for item in partial) if partial else 0.5
    score = min_score - 0.04
    padded = list(partial)

    for category in CONSTELLATION_CATEGORIES:
        if len(padded) >= 7:
            break
        if category in used:
            continue

        phrase = next(
            (item for item in evidence_phrases if item in original_text),
            original_text[:2] if len(original_text) >= 2 else original_text,
        )
        padded.append(
            ConstellationCandidate(
                category=category,
                score=max(0.05, score),
                recommended=False,
                evidence=[phrase],
                reason="원문과의 직접 연관성은 낮지만 선택 가능한 성단입니다.",
            )
        )
        score -= 0.04

    padded.sort(key=lambda item: item.score, reverse=True)
    return padded[:7]


def _sanitize_candidate_evidence(
    candidates: list[ConstellationCandidate],
    original_text: str,
) -> list[ConstellationCandidate]:
    fallback_phrases = _collect_evidence_phrases(original_text)
    sanitized: list[ConstellationCandidate] = []

    for candidate in candidates:
        valid = [phrase for phrase in candidate.evidence if phrase in original_text]
        if not valid:
            valid = [fallback_phrases[0]]
        sanitized.append(candidate.model_copy(update={"evidence": valid[:2]}))

    return sanitized


def _build_analysis_from_raw_content(
    content: str,
    original_text: str,
) -> NorthStarAnalysisAIResponse:
    data = parse_json_content(content)
    raw_candidates = data.get("candidates")
    if not isinstance(raw_candidates, list) or not raw_candidates:
        raise AIResponseInvalidError("AI 응답에 candidates가 없습니다.")

    partial: list[ConstellationCandidate] = []
    for item in raw_candidates:
        if not isinstance(item, dict):
            continue
        try:
            partial.append(ConstellationCandidate.model_validate(item))
        except ValidationError:
            continue

    if not partial:
        raise AIResponseInvalidError("유효한 성단 후보를 찾지 못했습니다.")

    padded = _pad_candidates_to_seven(partial, original_text)
    padded = _sanitize_candidate_evidence(padded, original_text)
    return NorthStarAnalysisAIResponse(candidates=padded)


def analyze_north_star_constellations(
    text: str,
    client: UpstageClient,
) -> NorthStarAnalysisAIResponse:
    system_prompt = NORTH_STAR_CONSTELLATION_SYSTEM_PROMPT.format(
        categories="\n".join(f"- {c}" for c in CONSTELLATION_CATEGORIES),
    )
    user_prompt = f"북극성 지표 원문:\n{text}"

    try:
        ai_result = client.complete_json(
            system_prompt,
            user_prompt,
            NorthStarAnalysisAIResponse,
        )
    except AIResponseInvalidError:
        content = client._chat(system_prompt, user_prompt)
        ai_result = _build_analysis_from_raw_content(content, text)

    ai_result = NorthStarAnalysisAIResponse(
        candidates=_sanitize_candidate_evidence(ai_result.candidates, text),
    )

    try:
        validate_evidence_in_original(ai_result, text)
    except ValueError as exc:
        raise AIResponseInvalidError(str(exc)) from exc

    return ai_result


def get_north_star_analysis_prompt_version() -> str:
    return NORTH_STAR_ANALYSIS_PROMPT_VERSION
