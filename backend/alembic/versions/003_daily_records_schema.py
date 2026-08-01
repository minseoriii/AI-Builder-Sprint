"""daily records schema

Revision ID: 003
Revises: 002
Create Date: 2026-07-31
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "daily_record_analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("recorded_on", sa.Date(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("ai_extracted_tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("final_tags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("category_ranking", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ai_primary_category", sa.String(length=50), nullable=True),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("prompt_version", sa.String(length=50), nullable=False),
        sa.Column("daily_record_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_daily_record_analyses_user_id"),
        "daily_record_analyses",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "daily_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("recorded_on", sa.Date(), nullable=False),
        sa.Column("primary_category", sa.String(length=50), nullable=False),
        sa.Column("ai_primary_category", sa.String(length=50), nullable=False),
        sa.Column("category_overridden", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("category_ranking", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "source_type",
            sa.String(length=30),
            server_default="DAILY_RECORD",
            nullable=False,
        ),
        sa.Column("analysis_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_daily_records_user_id"), "daily_records", ["user_id"], unique=False
    )

    op.create_table(
        "daily_record_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("daily_record_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("dimension", sa.String(length=20), nullable=False),
        sa.Column("value", sa.String(length=50), nullable=False),
        sa.Column("source", sa.String(length=10), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["daily_record_id"], ["daily_records.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_daily_record_tags_daily_record_id"),
        "daily_record_tags",
        ["daily_record_id"],
        unique=False,
    )

    op.create_table(
        "stars",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("recorded_on", sa.Date(), nullable=False),
        sa.Column("preview", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_type", "source_id", name="uq_star_source"),
    )
    op.create_index(op.f("ix_stars_user_id"), "stars", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_stars_user_id"), table_name="stars")
    op.drop_table("stars")
    op.drop_index(op.f("ix_daily_record_tags_daily_record_id"), table_name="daily_record_tags")
    op.drop_table("daily_record_tags")
    op.drop_index(op.f("ix_daily_records_user_id"), table_name="daily_records")
    op.drop_table("daily_records")
    op.drop_index(op.f("ix_daily_record_analyses_user_id"), table_name="daily_record_analyses")
    op.drop_table("daily_record_analyses")
