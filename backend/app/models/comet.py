import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, new_uuid


class Comet(Base, TimestampMixin):
    __tablename__ = "comets"
    __table_args__ = (
        UniqueConstraint("recommendation_id", name="uq_comet_recommendation"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=False
    )
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    recommendation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("comet_recommendations.id", ondelete="SET NULL"),
        nullable=True,
    )
    target_category: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_completion_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    activity_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    completed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
