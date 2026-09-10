from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "patty-secret-change-me-1234567890"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    DATABASE_URL: str = "sqlite:////home/lizandro/Projects/patty-apuntes/backend/patty.db"
    # para Postgres: postgresql+psycopg2://user:pass@localhost/patty

    class Config:
        env_file = ".env"


settings = Settings()
