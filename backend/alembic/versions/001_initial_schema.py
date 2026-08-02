"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nickname", sa.String(length=100), nullable=True),
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
    op.create_table(
        "north_stars",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("core_values", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("related_domains", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("prompt_version", sa.String(length=50), nullable=False),
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
    op.create_index(op.f("ix_north_stars_user_id"), "north_stars", ["user_id"], unique=True)
    op.create_table(
        "star_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("companion_type", sa.String(length=50), nullable=True),
        sa.Column("life_domains", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("related_values", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("sensory_tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("analysis_confidence", sa.Float(), nullable=True),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("prompt_version", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_star_entries_user_id"), "star_entries", ["user_id"], unique=False)
    op.create_table(
        "alignment_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_records", sa.Integer(), nullable=False),
        sa.Column("statistics", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("narrative", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("prompt_version", sa.String(length=50), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_alignment_reports_user_id"), "alignment_reports", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_alignment_reports_user_id"), table_name="alignment_reports")
    op.drop_table("alignment_reports")
    op.drop_index(op.f("ix_star_entries_user_id"), table_name="star_entries")
    op.drop_table("star_entries")
    op.drop_index(op.f("ix_north_stars_user_id"), table_name="north_stars")
    op.drop_table("north_stars")
    op.drop_table("profiles")
