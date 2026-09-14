"""fase4 pairing tokens (no destructivo)

Revision ID: d25ccdd1cb93
Revises: 2befa4471fc7
"""

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d25ccdd1cb93"
down_revision: str | None = "2befa4471fc7"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    if "pairing_tokens" not in inspect(op.get_bind()).get_table_names():
        op.create_table(
            "pairing_tokens",
            sa.Column("token", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), index=True),
            sa.Column("used", sa.Boolean(), server_default="0"),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )


def downgrade() -> None:
    op.drop_table("pairing_tokens")
