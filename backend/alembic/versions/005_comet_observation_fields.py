"""comet observation fields

Revision ID: 005
Revises: 004
Create Date: 2026-08-01
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "005"
down_revision: str | None = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("comets", sa.Column("reason", sa.Text(), nullable=True))
    op.add_column("comets", sa.Column("target_completion_date", sa.Date(), nullable=True))
    op.add_column("comets", sa.Column("activity_summary", sa.Text(), nullable=True))
    op.add_column("comets", sa.Column("completed_on", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("comets", "completed_on")
    op.drop_column("comets", "activity_summary")
    op.drop_column("comets", "target_completion_date")
    op.drop_column("comets", "reason")
