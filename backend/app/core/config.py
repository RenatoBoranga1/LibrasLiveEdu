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
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    class_join_token_expire_hours: int = 8
    transcript_retention_days: int = 30
    vlibras_api_url: str | None = None
    vlibras_api_key: str | None = None
    trusted_dictionary_sources: str = "VLibras"
    ai_summary_enabled: bool = False
    ai_provider: str = "local"
    ai_model: str | None = None
    ai_api_key: str | None = None
    ai_api_url: str = "https://api.openai.com/v1/chat/completions"
    summary_interval_seconds: int = 45
    summary_min_segments: int = 3
    summary_max_segments: int = 20
    ines_media_import_authorized: bool = False
    ines_media_authorization_reference: str | None = None
    ines_media_base_url: str = "https://dicionario.ines.gov.br/"
    ines_media_allowed_hosts: str = "dicionario.ines.gov.br"
    media_storage_dir: str = "storage/media"
    public_media_base_url: str = "/media"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def trusted_sources(self) -> set[str]:
        return {source.strip().lower() for source in self.trusted_dictionary_sources.split(",") if source.strip()}

    @property
    def ines_allowed_host_list(self) -> set[str]:
        return {host.strip().lower() for host in self.ines_media_allowed_hosts.split(",") if host.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
