import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.constants import CORE_VALUE_TAGS, LIFE_DOMAIN_TAGS


class CoreValueItem(BaseModel):
    tag: str
    weight: int = Field(ge=1, le=5)
    reason: str

    @field_validator("tag")
    @classmethod
    def validate_tag(cls, value: str) -> str:
        if value not in CORE_VALUE_TAGS:
            raise ValueError(f"허용되지 않은 핵심 가치 태그입니다: {value}")
        return value


class NorthStarUpdateRequest(BaseModel):
    text: str = Field(min_length=3, max_length=500)

    @field_validator("text")
    @classmethod
    def strip_text(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < 3:
            raise ValueError("북극성 문장은 최소 3자 이상이어야 합니다.")
        return stripped


class NorthStarAIResponse(BaseModel):
    summary: str
    core_values: list[CoreValueItem] = Field(min_length=1, max_length=5)
    related_domains: list[str] = Field(min_length=1)

    @field_validator("core_values")
    @classmethod
    def validate_unique_tags(cls, values: list[CoreValueItem]) -> list[CoreValueItem]:
        tags = [item.tag for item in values]
        if len(tags) != len(set(tags)):
            raise ValueError("중복된 핵심 가치 태그는 허용되지 않습니다.")
        return values

    @field_validator("related_domains")
    @classmethod
    def validate_domains(cls, values: list[str]) -> list[str]:
        for domain in values:
            if domain not in LIFE_DOMAIN_TAGS:
                raise ValueError(f"허용되지 않은 생활 영역 태그입니다: {domain}")
        return values


class NorthStarResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    original_text: str
    summary: str
    core_values: list[dict]
    related_domains: list[str]
    model_name: str
    prompt_version: str
    created_at: datetime
    updated_at: datetime
