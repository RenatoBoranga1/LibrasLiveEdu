from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_pair, decode_token, hash_password, utc_now, verify_password
from app.models import User
from app.schemas.api import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(user: User) -> TokenResponse:
    tokens = create_access_pair(user.id, user.role)
    return TokenResponse(**tokens, user=UserRead.model_validate(user))


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    if settings.environment == "production" and payload.role == "admin":
        raise HTTPException(status_code=403, detail="Cadastro publico de admin desabilitado em producao.")
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="E-mail ja cadastrado.")
    now = utc_now()
    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        birth_date=payload.birth_date,
        guardian_email=payload.guardian_email,
        school_name=payload.school_name,
        accepted_terms_at=now if payload.accept_terms else None,
        accepted_privacy_at=now if payload.accept_privacy else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha invalidos.")
    if get_settings().environment == "production" and user.password_hash == "demo-not-for-production":
        raise HTTPException(status_code=403, detail="Usuario demo bloqueado em producao.")
    return _token_response(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        token_payload = decode_token(payload.refresh_token, expected_type="refresh")
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Refresh token invalido ou expirado.") from exc
    user = db.get(User, int(token_payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="Usuario nao encontrado.")
    return _token_response(user)


@router.post("/logout")
def logout():
    return {"status": "ok", "message": "Remova os tokens do dispositivo."}


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user
