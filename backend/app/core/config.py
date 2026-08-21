from functools import lru_cache
from urllib.parse import urlparse

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_DATABASE_URL = "postgresql+psycopg://libraslive:libraslive@localhost:5432/libraslive"
DEFAULT_SECRET_KEYS = {
    "",
    "change-me-in-production",
    "change-me-use-a-long-random-value",
    "changeme",
    "default",
    "secret",
    "secret-key",
}


class Settings(BaseSettings):
    app_name: str = "LibrasLive Edu"
    environment: str = "development"
    database_url: str = Field(default=DEFAULT_DATABASE_URL)
    redis_url: str | None = None
    cors_origins: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3010,http://127.0.0.1:3010"
    )
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
    ines_import_enabled: bool = False
    ines_base_url: str = "https://dicionario.ines.gov.br/"
    ines_import_delay_ms: int = 1000
    ines_import_max_items: int = 10
    ines_import_approve_authorized: bool = False
    ines_import_download_media: bool = False
    ines_import_store_remote_url: bool = True
    ines_import_timeout_seconds: int = 15
    ines_import_use_browser: bool = False
    ines_import_authorization_text: str = "Uso autorizado pelo INES/Governo para o projeto LibrasLive Edu"
    ines_standard_video_fill_enabled: bool = False
    ines_standard_video_base_url: str = "https://dicionario.ines.gov.br/public/media/palavras/videos/"
    ines_standard_video_suffix: str = "Sm_Prog001.mp4"
    ines_standard_video_max_items: int = 20
    ines_standard_video_timeout_seconds: int = 15
    media_auto_fill_enabled: bool = False
    media_auto_fill_max_items: int = 10
    media_auto_fill_delay_ms: int = 1000
    media_auto_fill_timeout_seconds: int = 15
    media_auto_fill_allow_browser: bool = False
    media_auto_fill_approve_automatically: bool = False
    ifpr_gif_import_enabled: bool = False
    ifpr_gif_base_url: str = "https://ifpr.edu.br/umuarama/libras-gifs/"
    ifpr_gif_source_name: str = "IFPR Campus Umuarama - Libras GIFs"
    ifpr_gif_license_text: str = "Uso autorizado ou licença identificada para apoio educacional"
    ifpr_gif_license_notes: str = "GIF utilizado como apoio visual em Libras, com fonte registrada."

    crawler_enabled: bool = False
    crawler_max_pages: int = 500
    crawler_delay_ms: int = 1000
    crawler_timeout_seconds: int = 20
    crawler_user_agent: str = "LibrasLiveEdu-authorized-crawler/1.0"
    crawler_output_dir: str = "backend/data/generated"
    crawler_respect_robots: bool = True
    crawler_allow_external_domains: bool = False
    ines_full_catalog_import_enabled: bool = False
    ines_full_catalog_base_url: str = "https://dicionario.ines.gov.br/"
    ines_full_catalog_delay_ms: int = 1000
    ines_full_catalog_max_items: int = 500
    ines_full_catalog_use_browser: bool = False
    ines_full_catalog_user_agent: str = "LibrasLiveEdu-ines-full-catalog/1.0"
    ines_full_catalog_authorization_note: str = "Uso autorizado para o projeto social educacional LibrasLive Edu"

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


def _is_weak_secret(secret_key: str) -> bool:
    value = secret_key.strip()
    lowered = value.lower()
    return (
        len(value) < 32
        or lowered in DEFAULT_SECRET_KEYS
        or "change-me" in lowered
        or "replace-me" in lowered
    )


def _is_local_database_url(database_url: str) -> bool:
    lowered = database_url.strip().lower()
    hostname = (urlparse(lowered).hostname or "").lower()
    return (
        lowered == DEFAULT_DATABASE_URL.lower()
        or hostname in {"localhost", "127.0.0.1", "::1"}
        or lowered.startswith("sqlite")
    )


def _has_local_cors_origin(origins: list[str]) -> bool:
    for origin in origins:
        hostname = (urlparse(origin).hostname or "").lower()
        if hostname in {"localhost", "127.0.0.1", "::1"}:
            return True
    return False


def validate_production_settings(settings: Settings) -> None:
    if settings.environment.strip().lower() != "production":
        return

    problems: list[str] = []
    if settings.demo_mode:
        problems.append("DEMO_MODE deve ser false")
    if _is_weak_secret(settings.secret_key):
        problems.append("SECRET_KEY deve ter ao menos 32 caracteres e não pode usar valor padrão")
    if _is_local_database_url(settings.database_url):
        problems.append("DATABASE_URL não pode apontar para banco local/padrão")
    if _has_local_cors_origin(settings.cors_origin_list):
        problems.append("CORS_ORIGINS não pode conter localhost ou loopback")

    if problems:
        raise RuntimeError("Configuração insegura para produção: " + "; ".join(problems))


@lru_cache
def get_settings() -> Settings:
    return Settings()
