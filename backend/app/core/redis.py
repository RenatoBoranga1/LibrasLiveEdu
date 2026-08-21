from redis import Redis

from app.core.config import get_settings


def get_redis_client() -> Redis:
    """Shared Redis client for future fan-out, presence and background job coordination."""
    redis_url = get_settings().redis_url
    if not redis_url:
        raise RuntimeError("Redis não está configurado neste ambiente.")
    return Redis.from_url(redis_url, decode_responses=True)
