from fastapi import APIRouter, Depends, Request
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import utc_now
from app.models import ConsentRecord, DataRetentionPolicy, SavedWord, User
from app.schemas.api import ConsentRequest, ConsentRevokeRequest

router = APIRouter(tags=["privacy"])

PRIVACY_NOTICE = (
    "Este aplicativo pode processar transcricoes de aulas, palavras salvas e dados de uso para fins "
    "educacionais e de acessibilidade. Para criancas e adolescentes, o uso deve ocorrer com autorizacao "
    "da escola e/ou responsavel legal, conforme a politica da instituicao."
)


@router.get("/privacy/policy")
def privacy_policy(db: Session = Depends(get_db)):
    policies = list(db.scalars(select(DataRetentionPolicy).where(DataRetentionPolicy.active.is_(True))))
    if not policies:
        policies = [
            DataRetentionPolicy(
                entity_name="transcript_segments",
                retention_days=get_settings().transcript_retention_days,
                description="Transcricoes de aula expiram por padrao apos 30 dias no modo producao.",
                active=True,
            ),
            DataRetentionPolicy(
                entity_name="saved_words",
                retention_days=365,
                description="Palavras salvas por usuario autenticado podem ser mantidas para revisao educacional.",
                active=True,
            ),
        ]
    return {
        "notice": PRIVACY_NOTICE,
        "data_minimization": "Aluno anonimo nao precisa informar nome ou e-mail para assistir aula.",
        "raw_audio": "Audio bruto nao e armazenado por padrao.",
        "external_services": "Dados sensiveis nao devem ser enviados a servicos externos sem aviso e base legal.",
        "policies": [
            {
                "entity_name": policy.entity_name,
                "retention_days": policy.retention_days,
                "description": policy.description,
            }
            for policy in policies
        ],
    }


@router.post("/consent")
def create_consent(
    payload: ConsentRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    consent = ConsentRecord(
        user_id=user.id,
        guardian_name=payload.guardian_name,
        guardian_email=payload.guardian_email,
        consent_type=payload.consent_type,
        consent_text_version=payload.consent_text_version,
        accepted_at=utc_now(),
        ip_address=client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(consent)
    db.commit()
    return {"id": consent.id, "status": "accepted"}


@router.post("/consent/revoke")
def revoke_consent(
    payload: ConsentRevokeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    consent = db.scalar(
        select(ConsentRecord)
        .where(ConsentRecord.user_id == user.id, ConsentRecord.consent_type == payload.consent_type)
        .order_by(ConsentRecord.id.desc())
        .limit(1)
    )
    if consent:
        consent.revoked_at = utc_now()
        db.commit()
    return {"status": "revoked"}


@router.get("/me/data")
def export_my_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    saved_words = list(db.scalars(select(SavedWord).where(SavedWord.user_id == user.id)))
    consents = list(db.scalars(select(ConsentRecord).where(ConsentRecord.user_id == user.id)))
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email, "role": user.role},
        "saved_words": [
            {"id": item.id, "sign_id": item.sign_id, "class_session_id": item.class_session_id, "created_at": item.created_at}
            for item in saved_words
        ],
        "consents": [
            {
                "id": item.id,
                "consent_type": item.consent_type,
                "accepted_at": item.accepted_at,
                "revoked_at": item.revoked_at,
            }
            for item in consents
        ],
    }


@router.delete("/me/data")
def delete_my_data(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(delete(SavedWord).where(SavedWord.user_id == user.id))
    db.commit()
    return {"status": "deleted", "message": "Palavras salvas removidas. Solicite a escola para apagar transcricoes de aulas."}
