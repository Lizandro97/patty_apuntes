"""baseline esquema actual (Fase 0, no destructivo)

Revision ID: fc9e482fe794

Marca las bases existentes (p. ej. patty.db con tablas legacy board_*,
archivos, etc.) como punto de partida. Intencionalmente SIN operaciones:
el arranque usa init_db() == create_all (idempotente, conserva filas) y
las evoluciones van en revisiones Fase 2+ con backfill explicito.

Uso:
  alembic stamp head        # marca una DB existente sin tocar datos
  alembic upgrade head      # no-op en DBs marcadas; en DBs nuevas usar init_db()
"""

# revision identifiers, used by Alembic.
revision: str = "fc9e482fe794"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    """Baseline: sin operaciones (ver docstring)."""


def downgrade() -> None:
    """Baseline: sin operaciones (ver docstring)."""
