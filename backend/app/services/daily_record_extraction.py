from app.core.constants import (
    DAILY_RECORD_DIMENSIONS,
    DAILY_RECORD_EXTRACTION_PROMPT_VERSION,
)
from app.core.dimension_tags import (
    ACTIVITY_DERIVED_PERSON_TERMS,
    ACTIVITY_TERMS,
    EMOTION_TERMS,
    PERSON_INDICATOR_SUFFIXES,
    PERSON_NORMALIZED_TAGS,
    PLACE_TERMS,
)
from app.core.exceptions import AIResponseInvalidError
from app.schemas.daily_record import (
    DailyRecordExtractionAIResponse,
    DimensionExtraction,
    DimensionStatus,
    NormalizedCandidate,
)
from app.services.upstage import UpstageClient

DAILY_RECORD_EXTRACTION_MAX_TOKENS = 1536

DAILY_RECORD_EXTRACTION_RETRY_HINT = (
    "이전 응답 형식이 올바르지 않습니다. "
    "dimensions에 PERSON, PLACE, ACTIVITY, TIME, EMOTION 키가 모두 있어야 하며, "
    "각 차원은 status, raw_values, normalized_candidates, evidence를 포함해야 합니다. "
    "missing_question_types는 질문이 필요한 차원 식별자만 포함하세요. "
    "Markdown 코드 블록 없이 순수 JSON만 출력하세요."
)

DAILY_RECORD_EXTRACTION_SYSTEM_PROMPT = """\
당신은 사용자의 하루 기록 원문에서 다섯 가지 차원의 정보를 추출하는 AI입니다.
반드시 JSON 객체만 반환하세요. Markdown 코드 블록을 사용하지 마세요.

## 차원 정의 (반드시 준수)

### PERSON (함께한 사람)
- 사람 이름, 관계·역할(친구, 동료, 가족, 팀원, 나 자신 등)만 포함한다.
- 장소·기관(학교, 회사, 카페), 활동명(개발, 공부, 운동),
  직업 파생어(개발자, 학생)는 PERSON에 넣지 않는다.
- 원문에 함께한 사람이 명시되지 않았으면 values를 비우고 status를 MISSING으로 둔다.
- 활동만 언급되고 누구와 함께했는지 불명확하면 추측하지 말고 MISSING으로 둔다.

### PLACE (장소)
- 물리적 장소·기관·공간(학교, 회사, 카페, 집, 도서관, 헬스장 등)만 포함한다.
- "~에서"로 쓰인 장소 표현을 PLACE에 넣는다 (예: "학교에서" → "학교").

### ACTIVITY (활동)
- 행동·활동·업무·취미(개발, 공부, 운동, 대화, 회의 등)만 포함한다.
- 감정 표현(힘들어, 기쁨, 피곤)은 ACTIVITY에 넣지 않고 EMOTION에 넣는다.
- 활동과 감정을 하나의 값으로 합치지 않는다
  (예: "개발 힘들어" → ACTIVITY: "개발", EMOTION: "힘들어").

### TIME (시간)
- 시간적 맥락·빈도·시점(오랜만에, 하루종일, 아침, 주말, 처음으로, 꾸준히 등)만 포함한다.

### EMOTION (감정)
- 감정·기분·느낌(힘들어, 피로함, 기쁨, 편안함, 뿌듯함 등)만 포함한다.

## 차원별 상태 (status)

각 차원마다 status를 반환한다.
- PRESENT: 원문에서 충분히 확인 가능
- MISSING: 기록에 필요한 정보가 없음 → missing_question_types에 포함
- AMBIGUOUS: 여러 해석 가능 → missing_question_types에 포함
- NOT_APPLICABLE: 해당 기록에 적용되지 않음 (질문하지 않음)

별의 성단 판단에 실질적으로 필요한 정보가 부족할 때만 missing_question_types에 포함한다.
NOT_APPLICABLE인 차원은 missing_question_types에 넣지 않는다.

## 정규화 후보 (normalized_candidates)

- raw_values: 원문에 있는 구체적 표현 그대로
- normalized_candidates: 허용 태그 목록에서 가장 가까운 태그 (차원당 최대 3개, score 0~1)
- 허용 태그 예시:
  - PERSON: 친구, 동료, 가족, 나 자신, 팀원 ...
  - PLACE: 학교, 회사, 카페, 집, 도서관 ...
  - ACTIVITY: 개발, 공부, 운동, 대화, 업무 ...
  - TIME: 오랜만에, 하루종일, 꾸준히, 주말에 ...
  - EMOTION: 힘들어, 피로함, 편안함, 뿌듯함, 어려움 ...
- 원문 고유명사(민서, OO카페)는 raw_values에 보존하고,
  normalized_candidates는 가장 가까운 허용 태그로 매핑한다.

## 공통 규칙

- dimensions: PERSON, PLACE, ACTIVITY, TIME, EMOTION 다섯 키 모두 포함
- evidence: 원문에서 직접 확인 가능한 짧은 구절 (raw_values와 대응)
- 원문에 없는 사실 창작 금지
- 중복 값 금지
- missing_question_types: 질문이 필요한 차원 식별자만 (질문 문장 생성 금지)

## 예시 1 — 학교에서 혼자 개발

원문: "학교에서 하루종일 개발해서 힘들다"

```json
{{
  "dimensions": {{
    "PERSON": {{
      "status": "MISSING",
      "raw_values": [],
      "normalized_candidates": [],
      "evidence": []
    }},
    "PLACE": {{
      "status": "PRESENT",
      "raw_values": ["학교"],
      "normalized_candidates": [{{"tag": "학교", "score": 1.0}}],
      "evidence": ["학교에서"]
    }},
    "ACTIVITY": {{
      "status": "PRESENT",
      "raw_values": ["개발"],
      "normalized_candidates": [{{"tag": "개발", "score": 1.0}}],
      "evidence": ["개발"]
    }},
    "TIME": {{
      "status": "PRESENT",
      "raw_values": ["하루종일"],
      "normalized_candidates": [{{"tag": "하루종일", "score": 1.0}}],
      "evidence": ["하루종일"]
    }},
    "EMOTION": {{
      "status": "PRESENT",
      "raw_values": ["힘들다"],
      "normalized_candidates": [{{"tag": "힘들어", "score": 0.95}}],
      "evidence": ["힘들다"]
    }}
  }},
  "missing_question_types": ["PERSON"]
}}
```

## 반례 (절대 하지 말 것)

- "학교에서 개발" → PERSON: ["학교"] ❌ (학교는 PLACE)
- "개발해서 힘들다" → PERSON: ["개발자"] ❌ (개발은 ACTIVITY, 사람 추측 금지)
- "개발 힘들어" → ACTIVITY: ["개발 힘들어"] ❌ (감정 분리 필요)
- 함께한 사람 없음 → PERSON: ["개발"] ❌ (활동을 사람으로 넣지 않음)
"""


def _normalize_token(value: str) -> str:
    return value.strip().rstrip(".,!?~…")


def _is_place_term(value: str) -> bool:
    token = _normalize_token(value)
    return token in PLACE_TERMS


def _is_activity_term(value: str) -> bool:
    token = _normalize_token(value)
    return token in ACTIVITY_TERMS


def _is_emotion_term(value: str) -> bool:
    token = _normalize_token(value)
    if token in EMOTION_TERMS:
        return True
    return any(token.endswith(suffix) for suffix in ("힘들", "피곤", "지쳐", "기쁘", "슬퍼"))


def _is_activity_derived_person(value: str, original_text: str) -> bool:
    token = _normalize_token(value)
    if token not in ACTIVITY_DERIVED_PERSON_TERMS:
        return False
    return token not in original_text


def _is_valid_person_value(value: str, original_text: str) -> bool:
    token = _normalize_token(value)
    if token in PERSON_NORMALIZED_TAGS:
        return True
    if _is_place_term(token) or _is_activity_term(token):
        return False
    if _is_activity_derived_person(token, original_text):
        return False
    if any(original_text.find(f"{token}{suffix}") >= 0 for suffix in PERSON_INDICATOR_SUFFIXES):
        return True
    if len(token) <= 4 and token not in PLACE_TERMS and token not in ACTIVITY_TERMS:
        return True
    return False


def _split_activity_emotion(value: str) -> tuple[str | None, str | None]:
    token = _normalize_token(value)
    parts = token.split()
    if len(parts) >= 2:
        activity_part: list[str] = []
        emotion_part: list[str] = []
        for part in parts:
            if _is_emotion_term(part):
                emotion_part.append(part)
            elif _is_activity_term(part) or not emotion_part:
                activity_part.append(part)
            else:
                emotion_part.append(part)
        activity = " ".join(activity_part).strip() or None
        emotion = " ".join(emotion_part).strip() or None
        if activity and emotion:
            return activity, emotion

    for emotion in sorted(EMOTION_TERMS, key=len, reverse=True):
        if token.endswith(emotion) and len(token) > len(emotion):
            activity = token[: -len(emotion)].strip()
            if activity and _is_activity_term(activity):
                return activity, emotion
    return token, None


def _append_unique(target: list[str], value: str) -> None:
    token = _normalize_token(value)
    if token and token not in target:
        target.append(token)


def _rebuild_extraction(
    dimension: str,
    raw_values: list[str],
    evidence: list[str],
    status: DimensionStatus,
    normalized: list[NormalizedCandidate],
) -> DimensionExtraction:
    return DimensionExtraction(
        status=status,
        raw_values=raw_values,
        normalized_candidates=normalized,
        evidence=evidence,
    )


def correct_dimension_misclassification(
    ai_result: DailyRecordExtractionAIResponse,
    original_text: str,
) -> DailyRecordExtractionAIResponse:
    """AI 추출 결과에서 차원 오분류를 교정한다."""
    dims = {d: ai_result.dimensions[d].model_copy(deep=True) for d in DAILY_RECORD_DIMENSIONS}

    person_raw: list[str] = []
    person_evidence: list[str] = []
    place_raw = list(dims["PLACE"].raw_values)
    place_evidence = list(dims["PLACE"].evidence)
    activity_raw = list(dims["ACTIVITY"].raw_values)
    activity_evidence = list(dims["ACTIVITY"].evidence)
    emotion_raw = list(dims["EMOTION"].raw_values)
    emotion_evidence = list(dims["EMOTION"].evidence)

    person_evidence_list = dims["PERSON"].evidence or [""] * len(dims["PERSON"].raw_values)
    for value, ev in zip(dims["PERSON"].raw_values, person_evidence_list):
        token = _normalize_token(value)
        if _is_place_term(token):
            _append_unique(place_raw, token)
            if ev and ev not in place_evidence:
                place_evidence.append(ev)
        elif _is_activity_term(token) or _is_activity_derived_person(token, original_text):
            _append_unique(activity_raw, token)
            if ev and ev not in activity_evidence:
                activity_evidence.append(ev)
        elif _is_valid_person_value(token, original_text):
            _append_unique(person_raw, token)
            if ev and ev not in person_evidence:
                person_evidence.append(ev)

    corrected_activity: list[str] = []
    corrected_activity_evidence: list[str] = []
    for value, ev in zip(
        activity_raw,
        activity_evidence or [""] * len(activity_raw),
    ):
        activity_part, emotion_part = _split_activity_emotion(value)
        if activity_part:
            _append_unique(corrected_activity, activity_part)
            if ev and ev not in corrected_activity_evidence:
                corrected_activity_evidence.append(ev)
        if emotion_part:
            _append_unique(emotion_raw, emotion_part)
            if ev and ev not in emotion_evidence:
                emotion_evidence.append(ev)

    place_evidence_list = dims["PLACE"].evidence or [""] * len(dims["PLACE"].raw_values)
    for value, ev in zip(dims["PLACE"].raw_values, place_evidence_list):
        token = _normalize_token(value)
        if _is_place_term(token):
            _append_unique(place_raw, token)
            if ev and ev not in place_evidence:
                place_evidence.append(ev)

    for value, ev in zip(
        dims["ACTIVITY"].raw_values,
        dims["ACTIVITY"].evidence or [""] * len(dims["ACTIVITY"].raw_values),
    ):
        activity_part, emotion_part = _split_activity_emotion(value)
        if activity_part:
            _append_unique(corrected_activity, activity_part)
            if ev and ev not in corrected_activity_evidence:
                corrected_activity_evidence.append(ev)
        if emotion_part:
            _append_unique(emotion_raw, emotion_part)

    emotion_evidence_list = dims["EMOTION"].evidence or [""] * len(dims["EMOTION"].raw_values)
    for value, ev in zip(dims["EMOTION"].raw_values, emotion_evidence_list):
        token = _normalize_token(value)
        if _is_emotion_term(token):
            _append_unique(emotion_raw, token)
            if ev and ev not in emotion_evidence:
                emotion_evidence.append(ev)
        elif _is_activity_term(token):
            _append_unique(corrected_activity, token)

    def _resolve_status(
        dimension: str,
        raw_values: list[str],
        original_status: DimensionStatus,
    ) -> DimensionStatus:
        if raw_values:
            return DimensionStatus.PRESENT
        if original_status == DimensionStatus.NOT_APPLICABLE:
            return DimensionStatus.NOT_APPLICABLE
        if dimension == "PERSON" and corrected_activity and not person_raw:
            return DimensionStatus.MISSING
        if original_status in (DimensionStatus.AMBIGUOUS, DimensionStatus.MISSING):
            return original_status
        return DimensionStatus.MISSING

    person_status = _resolve_status("PERSON", person_raw, dims["PERSON"].status)
    place_status = _resolve_status("PLACE", place_raw, dims["PLACE"].status)
    activity_status = _resolve_status("ACTIVITY", corrected_activity, dims["ACTIVITY"].status)
    time_status = dims["TIME"].status
    if not dims["TIME"].raw_values and time_status == DimensionStatus.PRESENT:
        time_status = DimensionStatus.MISSING
    elif dims["TIME"].raw_values:
        time_status = DimensionStatus.PRESENT
    emotion_status = _resolve_status("EMOTION", emotion_raw, dims["EMOTION"].status)

    corrected_dimensions = {
        "PERSON": _rebuild_extraction(
            "PERSON",
            person_raw,
            person_evidence,
            person_status,
            dims["PERSON"].normalized_candidates,
        ),
        "PLACE": _rebuild_extraction(
            "PLACE", place_raw, place_evidence, place_status, dims["PLACE"].normalized_candidates
        ),
        "ACTIVITY": _rebuild_extraction(
            "ACTIVITY",
            corrected_activity,
            corrected_activity_evidence,
            activity_status,
            dims["ACTIVITY"].normalized_candidates,
        ),
        "TIME": _rebuild_extraction(
            "TIME",
            dims["TIME"].raw_values,
            dims["TIME"].evidence,
            time_status,
            dims["TIME"].normalized_candidates,
        ),
        "EMOTION": _rebuild_extraction(
            "EMOTION",
            emotion_raw,
            emotion_evidence,
            emotion_status,
            dims["EMOTION"].normalized_candidates,
        ),
    }

    missing: list[str] = []
    for dimension in DAILY_RECORD_DIMENSIONS:
        extraction = corrected_dimensions[dimension]
        if extraction.status in (DimensionStatus.MISSING, DimensionStatus.AMBIGUOUS):
            missing.append(dimension)
    for dimension in ai_result.missing_question_types:
        if dimension not in missing and corrected_dimensions[dimension].status not in (
            DimensionStatus.PRESENT,
            DimensionStatus.NOT_APPLICABLE,
        ):
            missing.append(dimension)

    return DailyRecordExtractionAIResponse(
        dimensions=corrected_dimensions,
        missing_question_types=missing,
    )


def validate_dimension_assignment(
    ai_result: DailyRecordExtractionAIResponse,
    original_text: str,
) -> None:
    """추출된 raw_values가 해당 차원에 적합한지 검사한다."""
    errors: list[str] = []

    for value in ai_result.dimensions["PERSON"].raw_values:
        token = _normalize_token(value)
        if _is_place_term(token):
            errors.append(f"PERSON에 장소 '{token}'가 포함되어 있습니다.")
        elif _is_activity_term(token):
            errors.append(f"PERSON에 활동 '{token}'가 포함되어 있습니다.")
        elif _is_activity_derived_person(token, original_text):
            errors.append(f"PERSON에 원문에 없는 추론 인물 '{token}'가 포함되어 있습니다.")

    for value in ai_result.dimensions["ACTIVITY"].raw_values:
        token = _normalize_token(value)
        if _is_emotion_term(token) and not _is_activity_term(token):
            errors.append(f"ACTIVITY에 감정 '{token}'가 포함되어 있습니다.")

    if errors:
        raise ValueError("; ".join(errors))


def _extract_tags_from_ai(ai_result: DailyRecordExtractionAIResponse) -> dict[str, list[str]]:
    tags: dict[str, list[str]] = {}
    for dimension in DAILY_RECORD_DIMENSIONS:
        tags[dimension] = list(ai_result.dimensions[dimension].raw_values)
    return tags


def _find_missing_question_types(
    ai_result: DailyRecordExtractionAIResponse,
) -> list[str]:
    missing: list[str] = []
    for dimension in DAILY_RECORD_DIMENSIONS:
        extraction = ai_result.dimensions[dimension]
        if extraction.status in (DimensionStatus.MISSING, DimensionStatus.AMBIGUOUS):
            if dimension not in missing:
                missing.append(dimension)
        elif not extraction.raw_values and extraction.status not in (
            DimensionStatus.NOT_APPLICABLE,
            DimensionStatus.PRESENT,
        ):
            if dimension not in missing:
                missing.append(dimension)
    for dimension in ai_result.missing_question_types:
        if dimension not in missing:
            extraction = ai_result.dimensions[dimension]
            if extraction.status not in (DimensionStatus.NOT_APPLICABLE,):
                missing.append(dimension)
    return missing


def validate_extraction_evidence(
    ai_result: DailyRecordExtractionAIResponse,
    original_text: str,
) -> None:
    for dimension in DAILY_RECORD_DIMENSIONS:
        extraction = ai_result.dimensions[dimension]
        for phrase in extraction.evidence:
            if phrase and phrase not in original_text:
                raise ValueError(
                    f"근거 문구가 원문에 포함되어 있지 않습니다: {phrase}"
                )


def analyze_daily_record_extraction(
    text: str,
    client: UpstageClient,
) -> tuple[DailyRecordExtractionAIResponse, dict[str, list[str]], list[str]]:
    user_prompt = f"하루 기록 원문:\n{text}"
    last_error: AIResponseInvalidError | None = None

    for attempt in range(2):
        try:
            ai_result = client.complete_json(
                DAILY_RECORD_EXTRACTION_SYSTEM_PROMPT,
                user_prompt,
                DailyRecordExtractionAIResponse,
                max_tokens=DAILY_RECORD_EXTRACTION_MAX_TOKENS,
                retry_hint=DAILY_RECORD_EXTRACTION_RETRY_HINT,
            )
            ai_result = correct_dimension_misclassification(ai_result, text)
            validate_extraction_evidence(ai_result, text)
            validate_dimension_assignment(ai_result, text)
            tags = _extract_tags_from_ai(ai_result)
            missing = _find_missing_question_types(ai_result)
            return ai_result, tags, missing
        except AIResponseInvalidError as exc:
            last_error = exc
            if attempt == 0:
                continue
            raise
        except ValueError as exc:
            last_error = AIResponseInvalidError(str(exc))
            if attempt == 0:
                continue
            raise last_error from exc

    if last_error is not None:
        raise last_error
    raise AIResponseInvalidError("AI 분석 결과를 처리하지 못했습니다.")


def get_daily_record_extraction_prompt_version() -> str:
    return DAILY_RECORD_EXTRACTION_PROMPT_VERSION
