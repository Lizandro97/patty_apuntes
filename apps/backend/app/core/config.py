import logging
import secrets

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_INSECURE_DEFAULT_MARKER = "insecure-dev-only"


def _default_secret() -> str:
    logger.warning(
        "SECRET_KEY is not set: generating an ephemeral dev/test-only key. "
        "Set SECRET_KEY in the environment for deployments."
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
    # for Postgres: postgresql+psycopg2://user:pass@localhost/patty

    # Local network: the backend listens on LAN, never localhost-only.
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    FOLIORA_HOSTNAME: str = "foliora.local"
    # Files and uploads.
    ATTACH_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 10

    @property
    def attach_path(self) -> str:
        """Absolute path of the attachments directory (avoids ambiguous relatives)."""
        from pathlib import Path

        return str(Path(self.ATTACH_DIR).expanduser().resolve())


settings = Settings()
