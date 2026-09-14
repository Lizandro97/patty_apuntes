"""Inicializacion no destructiva del esquema (Fase 0).

Solo crea tablas faltantes. Nunca borra ni modifica filas existentes:
el arranque repetido debe conservar users/records (test_fase0_baseline).
Las evoluciones de esquema van por Alembic a partir de Fase 2.
"""

from app.db.session import Base, engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
