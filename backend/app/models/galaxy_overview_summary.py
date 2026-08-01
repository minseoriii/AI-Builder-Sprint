import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, new_uuid


class GalaxyOverviewSummary(Base, TimestampMixin):
    __tablename__ = "galaxy_overview_summaries"
    __table_args__ = (
        UniqueConstraint("user_id", "year", "season", name="uq_galaxy_overview_summary"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    season: Mapped[str] = mapped_column(String(10), nullable=False)
    fingerprint: Mapped[str] = mapped_column(String(255), nullable=False)
    lines: Mapped[list] = mapped_column(JSONB, nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), nullable=False)
    north_star_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    total_star_count: Mapped[int] = mapped_column(Integer, nullable=False)
    latest_star_created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
