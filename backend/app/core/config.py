from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LibrasLive Edu"
    environment: str = "development"
    database_url: str = Field(
        default="postgresql+psycopg://libraslive:libraslive@localhost:5432/libraslive"
    )
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    demo_mode: bool = True
    vlibras_api_url: str | None = None
    vlibras_api_key: str | None = None
    trusted_dictionary_sources: str = "VLibras"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def trusted_sources(self) -> set[str]:
        return {source.strip().lower() for source in self.trusted_dictionary_sources.split(",") if source.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
