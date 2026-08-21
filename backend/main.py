from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth, classes, privacy, public, signs, websocket_routes
from app.core.config import get_settings, validate_production_settings
from app.core.errors import install_error_handlers

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    validate_production_settings(settings)
    yield


app = FastAPI(
    title="LibrasLive Edu API",
    description=(
        "Plataforma educacional inclusiva com legenda em tempo real, avatar em Libras, "
        "cards visuais e dicionario curado."
    ),
    version="0.1.0",
    lifespan=lifespan,
)
install_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.health_router)
app.include_router(public.health_router, prefix="/api", include_in_schema=False)
app.include_router(public.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(classes.router, prefix="/api")
app.include_router(signs.router, prefix="/api")
app.include_router(privacy.router, prefix="/api")
app.include_router(websocket_routes.router)

media_dir = Path(settings.media_storage_dir)
media_dir.mkdir(parents=True, exist_ok=True)
app.mount(settings.public_media_base_url, StaticFiles(directory=str(media_dir)), name="media")
