from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.selected_constellation import SelectedConstellation


class NorthStar(Base, TimestampMixin):
    __tablename__ = "north_stars"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=new_uuid
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, index=True, nullable=False
    )
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    selected_constellations: Mapped[list[SelectedConstellation]] = relationship(
        "SelectedConstellation",
        back_populates="north_star",
        cascade="all, delete-orphan",
        order_by="SelectedConstellation.sort_order",
    )
