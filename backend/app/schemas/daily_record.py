from datetime import date
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator

from app.core.constants import (
    CONSTELLATION_CATEGORIES,
    DAILY_RECORD_DIMENSIONS,
    DAILY_RECORD_TEXT_MAX_LENGTH,
    DAILY_RECORD_TEXT_MIN_LENGTH,
    TAG_MAX_LENGTH,
    TAG_MIN_LENGTH,
    TAGS_PER_DIMENSION_MAX,
    TAGS_TOTAL_MAX,
)
from app.schemas.comet import HomeCometRecommendation


class DailyRecordAnalysisStatus(StrEnum):
    NEEDS_INPUT = "NEEDS_INPUT"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    READY_FOR_CONFIRMATION = "READY_FOR_CONFIRMATION"
    CONFIRMED = "CONFIRMED"
    EXPIRED = "EXPIRED"


class StarSourceType(StrEnum):
    DAILY_RECORD = "DAILY_RECORD"
    COMET = "COMET"


class TagSource(StrEnum):
    AI = "AI"
    USER = "USER"


class DimensionExtraction(BaseModel):
    values: list[str]
    evidence: list[str]


class DailyRecordExtractionAIResponse(BaseModel):
    dimensions: dict[str, DimensionExtraction]
    missing_dimensions: list[str]

    @field_validator("dimensions")
    @classmethod
    def validate_dimensions(
        cls, value: dict[str, DimensionExtraction]
    ) -> dict[str, DimensionExtraction]:
        for dimension in DAILY_RECORD_DIMENSIONS:
            if dimension not in value:
                raise ValueError(f"누락된 차원: {dimension}")
        extra = set(value.keys()) - set(DAILY_RECORD_DIMENSIONS)
        if extra:
            raise ValueError(f"허용되지 않은 차원: {', '.join(sorted(extra))}")
        return value

    @field_validator("missing_dimensions")
    @classmethod
    def validate_missing_dimensions(cls, value: list[str]) -> list[str]:
        for dimension in value:
            if dimension not in DAILY_RECORD_DIMENSIONS:
                raise ValueError(f"허용되지 않은 차원: {dimension}")
        return value


class CategoryRankingItem(BaseModel):
    category: str
    score: float = Field(ge=0.0, le=1.0)
    evidence: list[str] = Field(min_length=1)
    reason: str

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in CONSTELLATION_CATEGORIES:
            raise ValueError(f"허용되지 않은 상위 성단입니다: {value}")
        return value


class DailyRecordClassificationAIResponse(BaseModel):
    primary_category: str
    category_ranking: list[CategoryRankingItem] = Field(min_length=1, max_length=3)

    @field_validator("primary_category")
    @classmethod
    def validate_primary_category(cls, value: str) -> str:
        if value not in CONSTELLATION_CATEGORIES:
            raise ValueError(f"허용되지 않은 상위 성단입니다: {value}")
        return value

    @field_validator("category_ranking")
    @classmethod
    def validate_ranking(
        cls, values: list[CategoryRankingItem], info
    ) -> list[CategoryRankingItem]:
        categories = [item.category for item in values]
        if len(categories) != len(set(categories)):
            raise ValueError("중복된 상위 성단 순위는 허용되지 않습니다.")
        scores = [item.score for item in values]
        if scores != sorted(scores, reverse=True):
            raise ValueError("순위는 적합도 내림차순이어야 합니다.")
        primary = info.data.get("primary_category")
        if primary and values[0].category != primary:
            raise ValueError("첫 번째 순위는 primary_category와 동일해야 합니다.")
        return values


def validate_tags_snapshot(tags: dict[str, list[str]]) -> dict[str, list[str]]:
    if set(tags.keys()) != set(DAILY_RECORD_DIMENSIONS):
        missing = set(DAILY_RECORD_DIMENSIONS) - set(tags.keys())
        extra = set(tags.keys()) - set(DAILY_RECORD_DIMENSIONS)
        if missing:
            raise ValueError(f"누락된 차원: {', '.join(sorted(missing))}")
        if extra:
            raise ValueError(f"허용되지 않은 차원: {', '.join(sorted(extra))}")

    total = 0
    normalized: dict[str, list[str]] = {}
    for dimension in DAILY_RECORD_DIMENSIONS:
        values = tags.get(dimension, [])
        if not values:
            raise ValueError(f"{dimension} 차원에 최소 1개의 태그가 필요합니다.")
        seen: set[str] = set()
        cleaned: list[str] = []
        for raw in values:
            stripped = raw.strip()
            if len(stripped) < TAG_MIN_LENGTH:
                raise ValueError("빈 태그는 허용되지 않습니다.")
            if len(stripped) > TAG_MAX_LENGTH:
                raise ValueError(f"태그는 최대 {TAG_MAX_LENGTH}자까지 가능합니다.")
            if any(ord(ch) < 32 for ch in stripped):
                raise ValueError("태그에 제어 문자를 포함할 수 없습니다.")
            if stripped in seen:
                raise ValueError(f"중복 태그: {stripped}")
            seen.add(stripped)
            cleaned.append(stripped)
        if len(cleaned) > TAGS_PER_DIMENSION_MAX:
            raise ValueError(f"차원당 최대 {TAGS_PER_DIMENSION_MAX}개의 태그만 가능합니다.")
        total += len(cleaned)
        normalized[dimension] = cleaned

    if total > TAGS_TOTAL_MAX:
        raise ValueError(f"전체 태그는 최대 {TAGS_TOTAL_MAX}개까지 가능합니다.")
    return normalized


class DailyRecordAnalyzeRequest(BaseModel):
    text: str = Field(max_length=DAILY_RECORD_TEXT_MAX_LENGTH)
    recorded_on: date

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < DAILY_RECORD_TEXT_MIN_LENGTH:
            raise ValueError("하루 기록은 최소 1자 이상이어야 합니다.")
        if len(stripped) > DAILY_RECORD_TEXT_MAX_LENGTH:
            raise ValueError(
                f"하루 기록은 최대 {DAILY_RECORD_TEXT_MAX_LENGTH}자까지 가능합니다."
            )
        return stripped


class MissingQuestion(BaseModel):
    dimension: str
    question: str


class DailyRecordAnalyzeResponse(BaseModel):
    analysis_id: str
    status: DailyRecordAnalysisStatus
    original_text: str
    tags: dict[str, list[str]]
    missing_questions: list[MissingQuestion]


class DailyRecordDetailsRequest(BaseModel):
    tags: dict[str, list[str]]

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, value: dict[str, list[str]]) -> dict[str, list[str]]:
        return validate_tags_snapshot(value)


class CategoryRankingResponse(BaseModel):
    category: str
    score: float
    reason: str


class DailyRecordDetailsResponse(BaseModel):
    analysis_id: str
    status: DailyRecordAnalysisStatus
    original_text: str
    recorded_on: date
    tags: dict[str, list[str]]
    primary_category: str
    category_ranking: list[CategoryRankingResponse]


class DailyRecordConfirmRequest(BaseModel):
    primary_category: str

    @field_validator("primary_category")
    @classmethod
    def validate_primary_category(cls, value: str) -> str:
        if value not in CONSTELLATION_CATEGORIES:
            raise ValueError(f"허용되지 않은 상위 성단입니다: {value}")
        return value


class DailyRecordConfirmResponse(BaseModel):
    daily_record_id: str
    star_id: str
    primary_category: str
    recorded_on: date


class DailyRecordTagResponse(BaseModel):
    dimension: str
    value: str
    source: TagSource


class DailyRecordResponse(BaseModel):
    id: str
    original_text: str
    recorded_on: date
    tags: dict[str, list[str]]
    primary_category: str
    category_ranking: list[CategoryRankingResponse]
    category_overridden: bool
    created_at: str


class HomeStarResponse(BaseModel):
    id: str
    source_type: StarSourceType
    recorded_on: date
    preview: str


class HomeConstellationResponse(BaseModel):
    category: str
    selected_from_north_star: bool
    star_count: int
    stars: list[HomeStarResponse]


class HomeResponse(BaseModel):
    north_star_text: str | None
    today_recorded: bool
    total_star_count: int
    constellations: list[HomeConstellationResponse]
    comet_recommendation: HomeCometRecommendation | None = None
