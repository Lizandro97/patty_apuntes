from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class SyncMeta(Base):
    """Global revision counter (single row id=1)."""

    __tablename__ = "sync_meta"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    current_revision: Mapped[int] = mapped_column(Integer, default=0)
