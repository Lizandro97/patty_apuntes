"""Inicializacion no destructiva del esquema (Fase 0).

Solo crea tablas faltantes. Nunca borra ni modifica filas existentes:
el arranque repetido debe conservar users/records (test_fase0_baseline).
Las evoluciones de esquema van por Alembic a partir de Fase 2.
"""

from sqlalchemy import inspect, text

from app.db.session import Base, engine


def _ensure_device_user_id() -> None:
    """Migracion ligera no destructiva: devices.user_id (Fase 0 seguridad).

    create_all no agrega columnas a tablas existentes; este ALTER cubre
    bases SQLite ya creadas sin tocar filas.
    """
    if engine.dialect.name != "sqlite":
        return
    cols = [c["name"] for c in inspect(engine).get_columns("devices")]
    if "user_id" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE devices ADD COLUMN user_id VARCHAR"))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_device_user_id()
