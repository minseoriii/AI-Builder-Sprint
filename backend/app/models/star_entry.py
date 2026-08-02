import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, new_uuid


class StarEntry(Base):
    __tablename__ = "star_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), index=True, nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    companion_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    life_domains: Mapped[list] = mapped_column(JSONB, nullable=False)
    related_values: Mapped[list] = mapped_column(JSONB, nullable=False)
    sensory_tags: Mapped[list] = mapped_column(JSONB, nullable=False)
    analysis_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
