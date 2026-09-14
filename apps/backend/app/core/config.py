import logging
import secrets

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_INSECURE_DEFAULT_MARKER = "insecure-dev-only"


def _default_secret() -> str:
    logger.warning(
        "SECRET_KEY no configurada: se genera una clave efimera solo para dev/test. "
        "Define SECRET_KEY en el entorno para despliegues."
    )
    return secrets.token_hex(32)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    SECRET_KEY: str = Field(default_factory=_default_secret)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    LOGIN_MAX_ATTEMPTS: int = 10
    LOGIN_WINDOW_SECONDS: int = 60
    DATABASE_URL: str = "sqlite:///./patty.db"
    # para Postgres: postgresql+psycopg2://user:pass@localhost/patty

    # Red local (Fase 0/4): el backend escucha en LAN, nunca solo localhost.
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    FOLIORA_HOSTNAME: str = "foliora.local"
    # Archivos y subidas (Fase 4/5).
    ATTACH_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 10

    @property
    def attach_path(self) -> str:
        """Ruta absoluta del directorio de adjuntos (evita relativos ambiguos)."""
        from pathlib import Path

        return str(Path(self.ATTACH_DIR).expanduser().resolve())


settings = Settings()
