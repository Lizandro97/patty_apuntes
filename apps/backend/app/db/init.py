"""Non-destructive schema initialization.

Only creates missing tables. Never deletes or modifies existing rows:
repeated startup must preserve users/records (test_startup_contract).
Schema evolution goes through Alembic.
"""

from sqlalchemy import inspect, text

from app.db.session import Base, engine


def _ensure_device_user_id() -> None:
    """Lightweight non-destructive migration: devices.user_id.

    create_all does not add columns to existing tables; this ALTER covers
    already-created SQLite databases without touching rows.
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
