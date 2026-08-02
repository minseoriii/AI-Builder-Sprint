import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, new_uuid


class SeasonalGalaxyReport(Base, TimestampMixin):
    __tablename__ = "seasonal_galaxy_reports"
    __table_args__ = (
        UniqueConstraint("user_id", "year", "season", name="uq_seasonal_galaxy_report"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    season: Mapped[str] = mapped_column(String(10), nullable=False)
    season_start: Mapped[date] = mapped_column(Date, nullable=False)
    season_end: Mapped[date] = mapped_column(Date, nullable=False)
    generated_through: Mapped[date] = mapped_column(Date, nullable=False)
    north_star_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    statistics_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    ai_analysis: Mapped[dict] = mapped_column(JSONB, nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), nullable=False)
    reflection: Mapped[str | None] = mapped_column(Text, nullable=True)
    reflection_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
