"""ieum onboarding schema

Revision ID: 002
Revises: 001
Create Date: 2026-07-31
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.rename_table("profiles", "user_profiles")
    op.add_column(
        "user_profiles",
        sa.Column("onboarding_completed", sa.Boolean(), server_default="false", nullable=False),
    )

    op.drop_column("north_stars", "summary")
    op.drop_column("north_stars", "core_values")
    op.drop_column("north_stars", "related_domains")
    op.drop_column("north_stars", "model_name")
    op.drop_column("north_stars", "prompt_version")
    op.add_column(
        "north_stars",
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
    )

    op.create_table(
        "north_star_analyses",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("original_text", sa.Text(), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("prompt_version", sa.String(length=50), nullable=False),
        sa.Column("candidates", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_used", sa.Boolean(), server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_north_star_analyses_user_id"), "north_star_analyses", ["user_id"], unique=False
    )

    op.create_table(
        "selected_constellations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("north_star_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("ai_recommended", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("ai_score", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["north_star_id"], ["north_stars.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("north_star_id", "category", name="uq_selected_constellation"),
    )
    op.create_index(
        op.f("ix_selected_constellations_north_star_id"),
        "selected_constellations",
        ["north_star_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_selected_constellations_north_star_id"), table_name="selected_constellations"
    )
    op.drop_table("selected_constellations")
    op.drop_index(op.f("ix_north_star_analyses_user_id"), table_name="north_star_analyses")
    op.drop_table("north_star_analyses")

    op.drop_column("north_stars", "is_active")
    op.add_column("north_stars", sa.Column("prompt_version", sa.String(length=50), nullable=False))
    op.add_column("north_stars", sa.Column("model_name", sa.String(length=100), nullable=False))
    op.add_column(
        "north_stars",
        sa.Column("related_domains", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    )
    op.add_column(
        "north_stars",
        sa.Column("core_values", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    )
    op.add_column("north_stars", sa.Column("summary", sa.Text(), nullable=False))

    op.drop_column("user_profiles", "onboarding_completed")
    op.rename_table("user_profiles", "profiles")
