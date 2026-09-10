import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Archivo(Base):
    __tablename__ = "archivos"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    titulo: Mapped[str] = mapped_column(String)
    tipo_revision: Mapped[str] = mapped_column(String, default="")
    periodo_inicio: Mapped[int] = mapped_column(Integer, default=lambda: datetime.now(UTC).year)
    periodo_fin: Mapped[int] = mapped_column(Integer, default=lambda: datetime.now(UTC).year)
    progreso: Mapped[int] = mapped_column(Integer, default=0)
    personal_count: Mapped[int] = mapped_column(Integer, default=2)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
