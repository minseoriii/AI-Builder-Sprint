from datetime import date
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator

from app.core.constants import (
    CONSTELLATION_CATEGORIES,
    GALAXY_REFLECTION_MAX_LENGTH,
    GALAXY_REFLECTION_MIN_LENGTH,
    GALAXY_REPORT_FIELD_MAX_LENGTH,
    GALAXY_SUMMARY_LINE_MAX_LENGTH,
    SEASON_LABELS,
)


class Season(StrEnum):
    SPRING = "SPRING"
    SUMMER = "SUMMER"
    AUTUMN = "AUTUMN"
    WINTER = "WINTER"


class GalaxyOverviewSummaryAIResponse(BaseModel):
    lines: list[str]

    @field_validator("lines")
    @classmethod
    def validate_lines(cls, value: list[str]) -> list[str]:
        if len(value) != 3:
            raise ValueError("요약은 정확히 3줄이어야 합니다.")
        validated: list[str] = []
        for line in value:
            stripped = line.strip()
            if not stripped:
                raise ValueError("빈 문장은 허용되지 않습니다.")
            if len(stripped) > GALAXY_SUMMARY_LINE_MAX_LENGTH:
                raise ValueError(
                    f"각 문장은 최대 {GALAXY_SUMMARY_LINE_MAX_LENGTH}자까지 가능합니다."
                )
            validated.append(stripped)
        return validated


class SeasonalGalaxyReportAIResponse(BaseModel):
    title: str
    north_star_alignment: str
    dominant_category_analysis: str
    record_trend_analysis: str
    monthly_change_analysis: str
    unobserved_area_analysis: str
    closing_observation: str

    @field_validator(
        "title",
        "north_star_alignment",
        "dominant_category_analysis",
        "record_trend_analysis",
        "monthly_change_analysis",
        "unobserved_area_analysis",
        "closing_observation",
    )
    @classmethod
    def validate_field(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("빈 문자열은 허용되지 않습니다.")
        if len(stripped) > GALAXY_REPORT_FIELD_MAX_LENGTH:
            raise ValueError(
                f"각 필드는 최대 {GALAXY_REPORT_FIELD_MAX_LENGTH}자까지 가능합니다."
            )
        return stripped


class ConstellationStat(BaseModel):
    category: str
    selected_from_north_star: bool
    star_count: int
    ratio: float


class CategoryCount(BaseModel):
    category: str
    star_count: int


class GalaxySummaryLines(BaseModel):
    lines: list[str]


class GalaxyOverviewResponse(BaseModel):
    year: int
    season: Season
    season_label: str
    north_star_text: str | None
    total_star_count: int
    observed_constellation_count: int
    active_constellation_count: int
    observation_days: int
    unselected_category_star_count: int
    constellations: list[ConstellationStat]
    largest_category: CategoryCount | None
    smallest_selected_category: CategoryCount | None
    unobserved_selected_categories: list[str]
    summary: GalaxySummaryLines


class TagFrequencyItem(BaseModel):
    value: str
    count: int


class DimensionTagFrequency(BaseModel):
    dimension: str
    top_tags: list[TagFrequencyItem]


class MonthlyDominantCategory(BaseModel):
    month: str
    category: str | None
    star_count: int


class LargestCategoryTagTrends(BaseModel):
    category: str
    PERSON: list[TagFrequencyItem] = Field(default_factory=list)
    PLACE: list[TagFrequencyItem] = Field(default_factory=list)
    ACTIVITY: list[TagFrequencyItem] = Field(default_factory=list)
    TIME: list[TagFrequencyItem] = Field(default_factory=list)
    EMOTION: list[TagFrequencyItem] = Field(default_factory=list)


class GalaxyReportListItem(BaseModel):
    id: str
    year: int
    season: Season
    season_label: str
    generated_through: date
    total_star_count: int
    created_at: str


class GalaxyReportListResponse(BaseModel):
    items: list[GalaxyReportListItem]


class GalaxyReportReflectionRequest(BaseModel):
    reflection: str

    @field_validator("reflection")
    @classmethod
    def validate_reflection(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < GALAXY_REFLECTION_MIN_LENGTH:
            raise ValueError("종합 소감은 비어 있을 수 없습니다.")
        if len(stripped) > GALAXY_REFLECTION_MAX_LENGTH:
            raise ValueError(
                f"종합 소감은 최대 {GALAXY_REFLECTION_MAX_LENGTH}자까지 가능합니다."
            )
        return stripped


class GalaxyReportDetailResponse(BaseModel):
    id: str
    year: int
    season: Season
    season_label: str
    season_start: date
    season_end: date
    generated_through: date
    created_at: str
    north_star_snapshot: dict
    statistics_snapshot: dict
    ai_analysis: dict
    reflection_question: str
    reflection: str | None
    reflection_updated_at: str | None


def season_label(season: Season | str) -> str:
    key = season.value if isinstance(season, Season) else season
    return SEASON_LABELS[key]


def validate_season_value(value: str) -> Season:
    try:
        return Season(value)
    except ValueError as exc:
        raise ValueError(f"유효하지 않은 계절입니다: {value}") from exc


def validate_category_in_stats(category: str | None) -> None:
    if category is not None and category not in CONSTELLATION_CATEGORIES:
        raise ValueError(f"허용되지 않은 상위 성단입니다: {category}")
