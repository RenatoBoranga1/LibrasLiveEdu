import secrets
from collections.abc import Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token, hash_password
from app.models import ClassSession, User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_or_create_demo_teacher(db: Session, name: str, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user
    user = User(name=name, email=email, password_hash=hash_password("demo-teacher-password"), role=UserRole.professor.value)
    db.add(user)
    db.flush()
    return user


def generate_access_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    left = "".join(secrets.choice(alphabet) for _ in range(4))
    right = "".join(secrets.choice(alphabet) for _ in range(4))
    return f"AULA-{left}-{right}"


def generate_unique_access_code(db: Session) -> str:
    for _ in range(20):
        code = generate_access_code()
        exists = db.scalar(select(ClassSession.id).where(ClassSession.access_code == code))
        if not exists:
            return code
    return f"AULA-{secrets.randbelow(900000) + 100000}"


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Autenticacao necessaria.")
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
        user_id = int(payload["sub"])
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalido ou expirado.") from exc
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario nao encontrado.")
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
        return db.get(User, int(payload["sub"]))
    except Exception:  # noqa: BLE001
        return None


def require_authenticated_user(user: User = Depends(get_current_user)) -> User:
    return user


def require_role(roles: list[str]) -> Callable[[User], User]:
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Voce nao tem permissao para acessar este recurso.",
            )
        return user

    return dependency


def client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None
