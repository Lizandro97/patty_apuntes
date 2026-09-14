"""fase6 staff_names por archivo (no destructivo, con backfill)

Revision ID: 669f5a26aa13
Revises: e5de9009668a

- Columna staff_names (JSON) en records, default [].
- Backfill: [] donde sea NULL.
- Downgrade: elimina la columna (nombres se pierden, filas no).

Robusto a create_all: la columna se crea solo si falta (inspector).
"""

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "669f5a26aa13"
down_revision: str | None = "e5de9009668a"
branch_labels: str | None = None
depends_on: str | None = None


def _cols(table: str) -> set:
    return {c["name"] for c in inspect(op.get_bind()).get_columns(table)}


def upgrade() -> None:
    if "staff_names" not in _cols("records"):
        op.add_column("records", sa.Column("staff_names", sa.JSON(), nullable=True))

    op.execute("UPDATE records SET staff_names = '[]' WHERE staff_names IS NULL")


def downgrade() -> None:
    op.drop_column("records", "staff_names")
