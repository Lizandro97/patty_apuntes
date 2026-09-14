"""fase2 sync LWW (no destructivo, con backfill)

Revision ID: 2befa4471fc7
Revises: fc9e482fe794

- Columnas sync en records/record_rows/cells (additive, con defaults).
- Tablas nuevas: devices, attachments, sync_meta.
- Backfill: records.client_uuid = id donde sea NULL; sync_meta fila id=1.
- Downgrade: elimina columnas/tablas (datos sync se pierden, filas no).

Robusto a create_all: init_db() puede haber anadido ya las columnas
(SQLite ADD COLUMN). Cada objeto se crea solo si falta (inspector).
"""

import sqlalchemy as sa
from sqlalchemy import inspect

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2befa4471fc7"
down_revision: str | None = "fc9e482fe794"
branch_labels: str | None = None
depends_on: str | None = None


def _cols(table: str) -> set:
    return {c["name"] for c in inspect(op.get_bind()).get_columns(table)}


def _tables() -> set:
    return set(inspect(op.get_bind()).get_table_names())


def _indexes(table: str) -> set:
    return {i["name"] for i in inspect(op.get_bind()).get_indexes(table)}


def upgrade() -> None:
    if "client_uuid" not in _cols("records"):
        op.add_column("records", sa.Column("client_uuid", sa.String(), nullable=True))
    if "revision" not in _cols("records"):
        op.add_column("records", sa.Column("revision", sa.Integer(), server_default="0"))
    if "device_id" not in _cols("records"):
        op.add_column("records", sa.Column("device_id", sa.String(), nullable=True))
    if "sync_status" not in _cols("records"):
        op.add_column("records", sa.Column("sync_status", sa.String(), server_default="clean"))
    if "last_synced_revision" not in _cols("records"):
        op.add_column(
            "records",
            sa.Column("last_synced_revision", sa.Integer(), server_default="0"),
        )
    if "deleted_at" not in _cols("records"):
        op.add_column("records", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    if "updated_at" not in _cols("record_rows"):
        op.add_column("record_rows", sa.Column("updated_at", sa.DateTime(), nullable=True))
    if "updated_at" not in _cols("cells"):
        op.add_column("cells", sa.Column("updated_at", sa.DateTime(), nullable=True))

    op.execute("UPDATE records SET client_uuid = id WHERE client_uuid IS NULL")
    op.execute("UPDATE record_rows SET updated_at = created_at WHERE updated_at IS NULL")
    op.execute("UPDATE cells SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL")
    op.execute("UPDATE records SET revision = 0 WHERE revision IS NULL")
    op.execute("UPDATE records SET sync_status = 'clean' WHERE sync_status IS NULL")
    op.execute("UPDATE records SET last_synced_revision = 0 WHERE last_synced_revision IS NULL")

    if "ix_records_client_uuid" not in _indexes("records"):
        op.create_index("ix_records_client_uuid", "records", ["client_uuid"], unique=True)
    if "ix_records_revision" not in _indexes("records"):
        op.create_index("ix_records_revision", "records", ["revision"])

    tables = _tables()
    if "devices" not in tables:
        op.create_table(
            "devices",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("name", sa.String(), server_default=""),
            sa.Column("token_hash", sa.String(), nullable=True),
            sa.Column("revoked", sa.Boolean(), server_default="0"),
            sa.Column("paired_at", sa.DateTime(), nullable=True),
        )
    if "attachments" not in tables:
        op.create_table(
            "attachments",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("record_id", sa.String(), sa.ForeignKey("records.id"), index=True),
            sa.Column("hash", sa.String(), index=True),
            sa.Column("mime", sa.String()),
            sa.Column("size", sa.Integer()),
            sa.Column("created_by_device", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
        )
    if "sync_meta" not in tables:
        op.create_table(
            "sync_meta",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("current_revision", sa.Integer(), server_default="0"),
        )
    op.execute(
        "INSERT INTO sync_meta (id, current_revision) "
        "SELECT 1, 0 WHERE NOT EXISTS (SELECT 1 FROM sync_meta WHERE id = 1)"
    )


def downgrade() -> None:
    op.drop_table("sync_meta")
    op.drop_table("attachments")
    op.drop_table("devices")
    op.drop_index("ix_records_revision", table_name="records")
    op.drop_index("ix_records_client_uuid", table_name="records")
    op.drop_column("cells", "updated_at")
    op.drop_column("record_rows", "updated_at")
    op.drop_column("records", "deleted_at")
    op.drop_column("records", "last_synced_revision")
    op.drop_column("records", "sync_status")
    op.drop_column("records", "device_id")
    op.drop_column("records", "revision")
    op.drop_column("records", "client_uuid")
