import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import func, select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.models import ClassSession, ClassStatus, Sign, SignCategory, Subject, User, UserRole  # noqa: E402
from app.services.text_normalizer import TextNormalizerService  # noqa: E402

DATA_DIR = ROOT / "data"
normalizer = TextNormalizerService()


def load_json(name: str):
    with (DATA_DIR / name).open("r", encoding="utf-8") as file:
        return json.load(file)


def get_or_create_category(db: Session, name: str, description: str | None = None) -> SignCategory:
    category = db.scalar(select(SignCategory).where(SignCategory.name == name))
    if category:
        if description and not category.description:
            category.description = description
        return category
    category = SignCategory(name=name, description=description)
    db.add(category)
    db.flush()
    return category


def get_or_create_subject(db: Session, name: str, description: str | None = None) -> Subject:
    subject = db.scalar(select(Subject).where(Subject.name == name))
    if subject:
        if description and not subject.description:
            subject.description = description
        return subject
    subject = Subject(name=name, description=description)
    db.add(subject)
    db.flush()
    return subject


def seed_users(db: Session) -> None:
    users = [
        ("Administrador Demo", "admin@libraslive.local", UserRole.admin.value),
        ("Professor Demo", "professor.demo@libraslive.local", UserRole.professor.value),
        ("Aluno Demo", "aluno.demo@libraslive.local", UserRole.student.value),
    ]
    for name, email, role in users:
        existing = db.scalar(select(User).where(User.email == email))
        if existing:
            continue
        db.add(User(name=name, email=email, password_hash="demo-not-for-production", role=role))


def seed_categories(db: Session) -> dict[str, SignCategory]:
    categories = {}
    for item in load_json("seed_categories.json"):
        categories[item["name"]] = get_or_create_category(db, item["name"], item.get("description"))
    return categories


def seed_subjects(db: Session) -> dict[str, Subject]:
    subjects = {}
    for item in load_json("seed_subjects.json"):
        subjects[item["name"]] = get_or_create_subject(db, item["name"], item.get("description"))
    return subjects


def seed_words(db: Session, categories: dict[str, SignCategory], subjects: dict[str, Subject]) -> int:
    created = 0
    for item in load_json("seed_educational_words.json"):
        normalized_word = normalizer.normalize_word(item["word"])
        existing = db.scalar(select(Sign).where(Sign.normalized_word == normalized_word))
        if existing:
            if existing.status == "approved":
                continue
            target = existing
        else:
            target = Sign(word=item["word"], normalized_word=normalized_word)
            db.add(target)
            created += 1

        category = categories.get(item["category"])
        subject = subjects.get(item["subject"]) if item.get("subject") else None
        target.word = item["word"]
        target.normalized_word = normalized_word
        target.category_id = category.id if category else None
        target.subject_id = subject.id if subject else None
        target.status = "pending"
        target.source_name = "Seed educacional inicial"
        target.license = "Aguardando curadoria"
        target.curator_notes = "Registro inicial para curadoria por especialista em Libras"
        target.example_sentence = item.get("example_sentence")
    return created


def seed_demo_class(db: Session) -> None:
    teacher = db.scalar(select(User).where(User.email == "professor.demo@libraslive.local"))
    subject = db.scalar(select(Subject).where(Subject.name == "Tecnologia"))
    if not teacher:
        return
    existing = db.scalar(select(ClassSession).where(ClassSession.access_code == "AULA-4821"))
    if existing:
        return
    db.add(
        ClassSession(
            teacher_id=teacher.id,
            title="Aula demo: tecnologia, dados e informacao",
            subject_id=subject.id if subject else None,
            access_code="AULA-4821",
            status=ClassStatus.active.value,
        )
    )


def seed_database(include_demo: bool = True) -> dict[str, int]:
    with SessionLocal() as db:
        seed_users(db)
        categories = seed_categories(db)
        subjects = seed_subjects(db)
        created_words = seed_words(db, categories, subjects)
        if include_demo:
            seed_demo_class(db)
        db.commit()
        total_words = db.scalar(select(func.count(Sign.id))) or 0
        return {
            "categories": len(categories),
            "subjects": len(subjects),
            "created_or_updated_words": created_words,
            "total_sign_records": total_words,
        }


if __name__ == "__main__":
    result = seed_database()
    print(json.dumps(result, ensure_ascii=False, indent=2))
