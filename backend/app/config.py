from typing import Literal
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/feature_store"
    REDIS_URL: str | None = None
    REDIS_TOKEN: str | None = None
    UPSTASH_REDIS_REST_URL: str | None = None
    UPSTASH_REDIS_REST_TOKEN: str | None = None
    GROQ_API_KEY: str | None = None
    SECRET_KEY: str = "supersecretkeyreplaceinproduction"
    ENVIRONMENT: Literal["development", "production", "testing"] = "development"

    @model_validator(mode="after")
    def resolve_redis_url(self) -> "Settings":
        if not self.REDIS_URL:
            if self.UPSTASH_REDIS_REST_URL and self.UPSTASH_REDIS_REST_TOKEN:
                # Strip any quotes that might exist in the raw env file value
                raw_url = self.UPSTASH_REDIS_REST_URL.strip('"').strip("'").strip()
                raw_token = self.UPSTASH_REDIS_REST_TOKEN.strip('"').strip("'").strip()
                
                clean_host = (
                    raw_url
                    .replace("https://", "")
                    .replace("http://", "")
                    .strip("/")
                )
                self.REDIS_URL = f"rediss://default:{raw_token}@{clean_host}:6379"
            else:
                self.REDIS_URL = "redis://redis:6379/0"
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

