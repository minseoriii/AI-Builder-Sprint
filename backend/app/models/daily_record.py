from __future__ import annotations

import uuid
from datetime import date
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.daily_record_tag import DailyRecordTag


class DailyRecord(Base, TimestampMixin):
    __tablename__ = "daily_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=False
    )
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    recorded_on: Mapped[date] = mapped_column(Date, nullable=False)
    primary_category: Mapped[str] = mapped_column(String(50), nullable=False)
    ai_primary_category: Mapped[str] = mapped_column(String(50), nullable=False)
    category_overridden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    category_ranking: Mapped[list] = mapped_column(JSONB, nullable=False)
    source_type: Mapped[str] = mapped_column(String(30), nullable=False, default="DAILY_RECORD")
    analysis_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    tags: Mapped[list[DailyRecordTag]] = relationship(
        "DailyRecordTag",
        back_populates="daily_record",
        cascade="all, delete-orphan",
        order_by="DailyRecordTag.sort_order",
    )
