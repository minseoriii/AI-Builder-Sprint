from datetime import date

from pydantic import BaseModel, Field, field_validator

from app.core.constants import (
    CONSTELLATION_CATEGORIES,
    NORTH_STAR_SELECTED_COUNT,
    NORTH_STAR_TEXT_MAX_LENGTH,
    NORTH_STAR_TEXT_MIN_LENGTH,
)


class ConstellationCandidate(BaseModel):
    category: str
    score: float = Field(ge=0.0, le=1.0)
    recommended: bool
    evidence: list[str] = Field(min_length=1)
    reason: str

    @field_validator("category")
    @classmethod
    def validate_category(cls, value: str) -> str:
        if value not in CONSTELLATION_CATEGORIES:
            raise ValueError(f"허용되지 않은 상위 성단입니다: {value}")
        return value


class NorthStarAnalysisAIResponse(BaseModel):
    candidates: list[ConstellationCandidate]

    @field_validator("candidates")
    @classmethod
    def validate_candidates(
        cls, values: list[ConstellationCandidate]
    ) -> list[ConstellationCandidate]:
        if len(values) != 7:
            raise ValueError("후보는 정확히 7개여야 합니다.")
        categories = [item.category for item in values]
        if len(categories) != len(set(categories)):
            raise ValueError("중복된 상위 성단 후보는 허용되지 않습니다.")
        recommended = [item for item in values if item.recommended]
        if not 1 <= len(recommended) <= 3:
            raise ValueError("AI 추천 후보는 1~3개여야 합니다.")
        scores = [item.score for item in values]
        if scores != sorted(scores, reverse=True):
            raise ValueError("후보는 적합도 내림차순이어야 합니다.")
        return values


class NorthStarAnalyzeRequest(BaseModel):
    text: str = Field(max_length=NORTH_STAR_TEXT_MAX_LENGTH)

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < NORTH_STAR_TEXT_MIN_LENGTH:
            raise ValueError("북극성 지표는 최소 1자 이상이어야 합니다.")
        if len(stripped) > NORTH_STAR_TEXT_MAX_LENGTH:
            raise ValueError(f"북극성 지표는 최대 {NORTH_STAR_TEXT_MAX_LENGTH}자까지 가능합니다.")
        return stripped


class ConstellationCandidateResponse(BaseModel):
    category: str
    score: float
    recommended: bool
    evidence: list[str]
    reason: str


class NorthStarAnalyzeResponse(BaseModel):
    analysis_id: str
    candidates: list[ConstellationCandidateResponse]


class NorthStarSaveRequest(BaseModel):
    analysis_id: str
    selected_categories: list[str] = Field(
        min_length=NORTH_STAR_SELECTED_COUNT,
        max_length=NORTH_STAR_SELECTED_COUNT,
    )

    @field_validator("selected_categories")
    @classmethod
    def validate_unique(cls, values: list[str]) -> list[str]:
        if len(values) != NORTH_STAR_SELECTED_COUNT:
            raise ValueError(
                f"상위 성단은 정확히 {NORTH_STAR_SELECTED_COUNT}개를 선택해야 합니다."
            )
        if len(values) != len(set(values)):
            raise ValueError("중복된 성단 선택은 허용되지 않습니다.")
        for category in values:
            if category not in CONSTELLATION_CATEGORIES:
                raise ValueError(f"허용되지 않은 상위 성단입니다: {category}")
        return values


class NorthStarSummary(BaseModel):
    text: str
    selected_categories: list[str]


class NorthStarEditability(BaseModel):
    editable: bool
    locked_season_year: int | None = None
    locked_season: str | None = None
    locked_season_label: str | None = None
    editable_from: date | None = None


class OnboardingStatusResponse(BaseModel):
    onboarding_completed: bool
    north_star: NorthStarSummary | None = None
    north_star_editability: NorthStarEditability | None = None
