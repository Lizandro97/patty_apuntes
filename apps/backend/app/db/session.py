from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

DATABASE_URL = settings.resolved_database_url

if DATABASE_URL.startswith("sqlite"):
    # Local dev and tests: single-file database, no pool needed.
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Hosted Postgres (Neon free): small pool, pre-ping against sleepy nodes.
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_recycle=300,
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
