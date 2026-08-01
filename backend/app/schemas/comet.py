from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator

from app.core.constants import (
    COMET_ACTIVITY_SUMMARY_MAX_LENGTH,
    COMET_ACTIVITY_SUMMARY_MIN_LENGTH,
    COMET_DESCRIPTION_MAX_LENGTH,
    COMET_ESTIMATED_MINUTES_MAX,
    COMET_ESTIMATED_MINUTES_MIN,
    COMET_REASON_MAX_LENGTH,
    COMET_TITLE_MAX_LENGTH,
    COMET_TITLE_MIN_LENGTH,
    CONSTELLATION_CATEGORIES,
)


class CometRecommendationStatus(StrEnum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class CometStatus(StrEnum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class CometSourceType(StrEnum):
    AI_RECOMMENDATION = "AI_RECOMMENDATION"
    USER_CREATED = "USER_CREATED"


class CometRecordStatus(StrEnum):
    RECORDED = "RECORDED"
    STAR_CREATED = "STAR_CREATED"


class CometRecommendationAIResponse(BaseModel):
    target_category: str
    title: str
    description: str
    reason: str
    estimated_minutes: int = Field(ge=COMET_ESTIMATED_MINUTES_MIN, le=COMET_ESTIMATED_MINUTES_MAX)

    @field_validator("target_category")
    @classmethod
    def validate_target_category(cls, value: str) -> str:
        if value not in CONSTELLATION_CATEGORIES:
            raise ValueError(f"허용되지 않은 상위 성단입니다: {value}")
        return value

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < COMET_TITLE_MIN_LENGTH:
            raise ValueError("제목은 비어 있을 수 없습니다.")
        if len(stripped) > COMET_TITLE_MAX_LENGTH:
            raise ValueError(f"제목은 최대 {COMET_TITLE_MAX_LENGTH}자까지 가능합니다.")
        return stripped

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        if len(value) > COMET_DESCRIPTION_MAX_LENGTH:
            raise ValueError(
                f"설명은 최대 {COMET_DESCRIPTION_MAX_LENGTH}자까지 가능합니다."
            )
        return value.strip()

    @field_validator("reason")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        if len(value) > COMET_REASON_MAX_LENGTH:
            raise ValueError(f"이유는 최대 {COMET_REASON_MAX_LENGTH}자까지 가능합니다.")
        return value.strip()


class CometRecommendationItem(BaseModel):
    id: str
    target_category: str
    title: str
    description: str
    reason: str
    estimated_minutes: int
    expires_at: datetime


class CometRecommendationResponse(BaseModel):
    recommendation: CometRecommendationItem | None


class CometRecommendationGenerateResponse(BaseModel):
    recommendation: CometRecommendationItem
    reused: bool


class CometItem(BaseModel):
    id: str
    source_type: CometSourceType
    target_category: str
    title: str
    description: str | None
    reason: str | None
    status: CometStatus
    created_at: datetime
    target_completion_date: date | None
    completed_on: date | None
    completed_at: datetime | None
    activity_summary: str | None
    record_status: CometRecordStatus | None = None
    star_id: str | None = None


class CometListResponse(BaseModel):
    items: list[CometItem]


class CometCreateRequest(BaseModel):
    title: str
    target_category: str
    description: str | None = None
    target_completion_date: date | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < COMET_TITLE_MIN_LENGTH:
            raise ValueError("제목은 비어 있을 수 없습니다.")
        if len(stripped) > COMET_TITLE_MAX_LENGTH:
            raise ValueError(f"제목은 최대 {COMET_TITLE_MAX_LENGTH}자까지 가능합니다.")
        return stripped

    @field_validator("target_category")
    @classmethod
    def validate_target_category(cls, value: str) -> str:
        if value not in CONSTELLATION_CATEGORIES:
            raise ValueError(f"허용되지 않은 상위 성단입니다: {value}")
        return value

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            return None
        if len(stripped) > COMET_DESCRIPTION_MAX_LENGTH:
            raise ValueError(
                f"설명은 최대 {COMET_DESCRIPTION_MAX_LENGTH}자까지 가능합니다."
            )
        return stripped


class CometUpdateRequest(BaseModel):
    title: str | None = None
    target_category: str | None = None
    description: str | None = None
    target_completion_date: date | None = None
    activity_summary: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if len(stripped) < COMET_TITLE_MIN_LENGTH:
            raise ValueError("제목은 비어 있을 수 없습니다.")
        if len(stripped) > COMET_TITLE_MAX_LENGTH:
            raise ValueError(f"제목은 최대 {COMET_TITLE_MAX_LENGTH}자까지 가능합니다.")
        return stripped

    @field_validator("target_category")
    @classmethod
    def validate_target_category(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in CONSTELLATION_CATEGORIES:
            raise ValueError(f"허용되지 않은 상위 성단입니다: {value}")
        return value

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            return None
        if len(stripped) > COMET_DESCRIPTION_MAX_LENGTH:
            raise ValueError(
                f"설명은 최대 {COMET_DESCRIPTION_MAX_LENGTH}자까지 가능합니다."
            )
        return stripped

    @field_validator("activity_summary")
    @classmethod
    def validate_activity_summary(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if len(stripped) < COMET_ACTIVITY_SUMMARY_MIN_LENGTH:
            raise ValueError("활동 요약은 비어 있을 수 없습니다.")
        if len(stripped) > COMET_ACTIVITY_SUMMARY_MAX_LENGTH:
            raise ValueError(
                f"활동 요약은 최대 {COMET_ACTIVITY_SUMMARY_MAX_LENGTH}자까지 가능합니다."
            )
        return stripped


class CometCompleteRequest(BaseModel):
    completed_on: date | None = None
    activity_summary: str

    @field_validator("activity_summary")
    @classmethod
    def validate_activity_summary(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < COMET_ACTIVITY_SUMMARY_MIN_LENGTH:
            raise ValueError("활동 요약은 비어 있을 수 없습니다.")
        if len(stripped) > COMET_ACTIVITY_SUMMARY_MAX_LENGTH:
            raise ValueError(
                f"활동 요약은 최대 {COMET_ACTIVITY_SUMMARY_MAX_LENGTH}자까지 가능합니다."
            )
        return stripped


class CometCompleteResponse(BaseModel):
    comet_id: str
    completed_on: date
    activity_summary: str
    record_status: CometRecordStatus


class CometCreateStarResponse(BaseModel):
    comet_id: str
    star_id: str
    category: str
    recorded_on: date
    record_status: CometRecordStatus


class HomeCometRecommendation(BaseModel):
    id: str
    target_category: str
    title: str
    estimated_minutes: int
