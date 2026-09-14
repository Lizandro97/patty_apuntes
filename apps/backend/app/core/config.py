from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "patty-secret-change-me-1234567890"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    LOGIN_MAX_ATTEMPTS: int = 10
    LOGIN_WINDOW_SECONDS: int = 60
    DATABASE_URL: str = "sqlite:////home/lizandro/Projects/patty-apuntes/apps/backend/patty.db"
    # para Postgres: postgresql+psycopg2://user:pass@localhost/patty

    # Red local (Fase 0/4): el backend escucha en LAN, nunca solo localhost.
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    FOLIORA_HOSTNAME: str = "foliora.local"
    # Archivos y subidas (Fase 4/5).
    ATTACH_DIR: str = "./uploads"
    MAX_UPLOAD_MB: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
