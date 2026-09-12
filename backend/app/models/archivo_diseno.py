import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ArchivoDiseno(Base):
    """Diseño visual por archivo: sección 'hoja' (A4: orientación, zoom,
    dimensiones) o 'tabla' (anchos de columna, altos de fila)."""

    __tablename__ = "archivo_diseno"
    __table_args__ = (UniqueConstraint("archivo_id", "seccion", name="uq_diseno_seccion"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    archivo_id: Mapped[str] = mapped_column(
        String, ForeignKey("archivos.id", ondelete="CASCADE"), index=True
    )
    seccion: Mapped[str] = mapped_column(String)  # hoja | tabla
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC)
    )
