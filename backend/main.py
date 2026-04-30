from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth, classes, privacy, public, signs, websocket_routes
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="LibrasLive Edu API",
    description=(
        "Plataforma educacional inclusiva com legenda em tempo real, avatar em Libras, "
        "cards visuais e dicionario curado."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(classes.router, prefix="/api")
app.include_router(signs.router, prefix="/api")
app.include_router(privacy.router, prefix="/api")
app.include_router(websocket_routes.router)

media_dir = Path(settings.media_storage_dir)
media_dir.mkdir(parents=True, exist_ok=True)
app.mount(settings.public_media_base_url, StaticFiles(directory=str(media_dir)), name="media")


@app.on_event("startup")
async def startup_security_checks() -> None:
    if settings.environment == "production" and settings.demo_mode:
        print("SECURITY WARNING: DEMO_MODE=true em ENVIRONMENT=production. Desative antes de uso real.")
