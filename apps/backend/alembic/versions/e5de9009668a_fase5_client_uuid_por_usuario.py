"""fase5 client_uuid por usuario (no destructivo)

Revision ID: e5de9009668a
Revises: d25ccdd1cb93

client_uuid pasa de UNIQUE global a UNIQUE(user_id, client_uuid):
dos usuarios pueden sincronizar el mismo uuid generado sin colisionar.
"""

from sqlalchemy import inspect

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5de9009668a"
down_revision: str | None = "d25ccdd1cb93"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    # SQLite no soporta ALTER de constraints: batch mode (copia-mueve).
    with op.batch_alter_table("records", recreate="always") as batch:
        insp = inspect(op.get_bind())
        indexes = {i["name"] for i in insp.get_indexes("records")}
        uniques = {c["name"] for c in insp.get_unique_constraints("records")}
        if "ix_records_client_uuid" in indexes:
            batch.drop_index("ix_records_client_uuid")
        if "uq_record_user_client" not in uniques:
            batch.create_unique_constraint("uq_record_user_client", ["user_id", "client_uuid"])
    if "ix_records_client_uuid" not in {
        i["name"] for i in inspect(op.get_bind()).get_indexes("records")
    }:
        op.create_index("ix_records_client_uuid", "records", ["client_uuid"])


def downgrade() -> None:
    op.drop_index("ix_records_client_uuid", table_name="records")
    op.drop_constraint("uq_record_user_client", "records", type_="unique")
