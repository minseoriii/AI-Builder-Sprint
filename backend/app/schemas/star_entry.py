import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import COMPANION_TYPES, CORE_VALUE_TAGS, LIFE_DOMAIN_TAGS, SENSORY_TAGS


class RelatedValueItem(BaseModel):
    tag: str
    strength: int = Field(ge=1, le=3)
    evidence: str

    @field_validator("tag")
    @classmethod
    def validate_tag(cls, value: str) -> str:
        if value not in CORE_VALUE_TAGS:
            raise ValueError(f"허용되지 않은 핵심 가치 태그입니다: {value}")
        return value


class StarCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=1000)
    companion_type: str | None = None

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("기록 내용은 최소 1자 이상이어야 합니다.")
        return stripped

    @field_validator("companion_type")
    @classmethod
    def validate_companion(cls, value: str | None) -> str | None:
        if value is not None and value not in COMPANION_TYPES:
            raise ValueError(f"허용되지 않은 누구와 태그입니다: {value}")
        return value


class StarEntryAIResponse(BaseModel):
    life_domains: list[str] = Field(min_length=1, max_length=3)
    related_values: list[RelatedValueItem] = Field(max_length=4)
    sensory_tags: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("life_domains")
    @classmethod
    def validate_life_domains(cls, values: list[str]) -> list[str]:
        for domain in values:
            if domain not in LIFE_DOMAIN_TAGS:
                raise ValueError(f"허용되지 않은 생활 영역 태그입니다: {domain}")
        return values

    @field_validator("sensory_tags")
    @classmethod
    def validate_sensory_tags(cls, values: list[str]) -> list[str]:
        for tag in values:
            if tag not in SENSORY_TAGS:
                raise ValueError(f"허용되지 않은 감각 태그입니다: {tag}")
        return values


class StarEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    content: str
    companion_type: str | None
    life_domains: list[str]
    related_values: list[dict]
    sensory_tags: list[str]
    analysis_confidence: float | None
    model_name: str
    prompt_version: str
    created_at: datetime


class StarListResponse(BaseModel):
    items: list[StarEntryResponse]
    total: int
    limit: int
    offset: int
