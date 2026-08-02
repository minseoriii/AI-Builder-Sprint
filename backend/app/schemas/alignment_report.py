import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AlignmentReportRequest(BaseModel):
    days: int = Field(default=30, ge=1, le=365)


class ValueObservationStat(BaseModel):
    tag: str
    north_star_weight: int
    observed_record_count: int
    observation_rate: float
    strength_sum: int


class RepresentativeRecord(BaseModel):
    star_id: uuid.UUID
    content: str
    strength: int
    evidence: str
    created_at: datetime


class LessObservedValue(BaseModel):
    tag: str
    observation_rate: float


class AlignmentStatistics(BaseModel):
    total_records: int
    aligned_records: int
    aligned_record_rate: float
    value_observations: list[ValueObservationStat]
    representative_records: dict[str, list[RepresentativeRecord]]
    less_observed_values: list[LessObservedValue]
    data_sufficiency: str


class NarrativeValueExplanation(BaseModel):
    tag: str
    explanation: str


class AlignmentNarrativeAIResponse(BaseModel):
    summary: str
    well_observed_values: list[NarrativeValueExplanation]
    less_observed_values: list[NarrativeValueExplanation]
    reflection_question: str
    data_note: str


class AlignmentReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    period_start: datetime
    period_end: datetime
    total_records: int
    statistics: dict
    narrative: dict
    model_name: str
    prompt_version: str
    created_at: datetime


class AlignmentReportListResponse(BaseModel):
    items: list[AlignmentReportResponse]
    total: int
    limit: int
    offset: int
