import pytest

from app.core.config import Settings, validate_production_settings


SAFE_PRODUCTION = {
    "environment": "production",
    "demo_mode": False,
    "secret_key": "a-secure-production-secret-with-more-than-32-characters",
    "database_url": "postgresql+psycopg://app:password@db.example.com:5432/libraslive",
    "cors_origins": "https://libraslive.example.org",
}


def production_settings(**overrides) -> Settings:
    return Settings(_env_file=None, **{**SAFE_PRODUCTION, **overrides})


def test_safe_production_settings_are_accepted():
    validate_production_settings(production_settings())


@pytest.mark.parametrize(
    ("overrides", "expected_message"),
    [
        ({"demo_mode": True}, "DEMO_MODE deve ser false"),
        ({"secret_key": "change-me-in-production"}, "SECRET_KEY"),
        ({"secret_key": "short"}, "SECRET_KEY"),
        (
            {"database_url": "postgresql+psycopg://libraslive:libraslive@localhost:5432/libraslive"},
            "DATABASE_URL",
        ),
        ({"database_url": "postgresql+psycopg://localhost:5432/libraslive"}, "DATABASE_URL"),
        ({"cors_origins": "https://school.example.org,http://localhost:3000"}, "CORS_ORIGINS"),
        ({"cors_origins": "http://127.0.0.1:3010"}, "CORS_ORIGINS"),
    ],
)
def test_insecure_production_settings_block_startup(overrides, expected_message):
    with pytest.raises(RuntimeError, match=expected_message):
        validate_production_settings(production_settings(**overrides))


def test_development_keeps_local_defaults_available():
    validate_production_settings(Settings(_env_file=None, environment="development"))
