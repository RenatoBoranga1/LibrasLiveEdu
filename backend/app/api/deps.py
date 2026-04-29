import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ClassSession, User, UserRole


def get_or_create_demo_teacher(db: Session, name: str, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user
    user = User(name=name, email=email, password_hash="demo-not-for-production", role=UserRole.professor.value)
    db.add(user)
    db.flush()
    return user


def generate_access_code() -> str:
    digits = "".join(secrets.choice("0123456789") for _ in range(4))
    return f"AULA-{digits}"


def generate_unique_access_code(db: Session) -> str:
    for _ in range(20):
        code = generate_access_code()
        exists = db.scalar(select(ClassSession.id).where(ClassSession.access_code == code))
        if not exists:
            return code
    return f"AULA-{secrets.randbelow(900000) + 100000}"
