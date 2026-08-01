from datetime import date

from pydantic import BaseModel

from app.schemas.daily_record import StarSourceType


class StarDetailResponse(BaseModel):
    id: str
    source_type: StarSourceType
    category: str
    recorded_on: date
    recorded_year: int
    recorded_month: int
    recorded_day: int
    content: str
    tags: dict[str, list[str]] | None = None


class ConstellationStarsResponse(BaseModel):
    category: str
    stars: list[StarDetailResponse]
