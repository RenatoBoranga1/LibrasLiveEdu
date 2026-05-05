from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_optional_user, require_role
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import hash_password, utc_now
from app.importers.ines_authorized_media_importer import InesAuthorizedMediaImporter
from app.importers.ines_media_importer import InesMediaImporter
from app.importers.libras_dictionary_importer import LibrasDictionaryImporter
from app.models import ClassSession, ImportJob, SavedWord, Sign, SignAuditLog, User, UserRole
from app.repositories.sign_repository import SignRepository
from app.schemas.api import (
    AdminStats,
    InesMediaAutoPendingRequest,
    InesMediaAutoSelectedRequest,
    InesMediaDiagnoseRequest,
    InesMediaDiagnoseResponse,
    InesMediaImportJobResponse,
    InesMediaImportRequest,
    InesMediaImportStartRequest,
    ImportJobRead,
    ImportRequest,
    LibrasGifMediaImportRequest,
    ManualSignCreate,
    RejectSignRequest,
    SavedWordCreate,
    SignCurationRequest,
    SignMediaUpdate,
    SignRead,
    SignUpdate,
)
from app.services.text_normalizer import TextNormalizerService

router = APIRouter(tags=["signs"])


@router.get("/signs", response_model=list[SignRead])
def list_signs(
    word: str | None = None,
    category_id: int | None = None,
    subject_id: int | None = None,
    status: str | None = None,
    source_name: str | None = None,
    db: Session = Depends(get_db),
):
    normalized_word = TextNormalizerService().normalize_word(word) if word else None
    return SignRepository(db).search(normalized_word, category_id, subject_id, status, source_name=source_name)


@router.get("/signs/lookup")
def lookup_sign(word: str, db: Session = Depends(get_db)):
    normalized_word = TextNormalizerService().normalize_word(word)
    sign = SignRepository(db).find_best_by_normalized_word(normalized_word)
    if not sign:
        return {"status": "unavailable", "word": word, "message": "Sinal ainda não cadastrado."}
    if sign.status in {"pending", "review", "needs_specialist_review"}:
        return {
            "status": "pending",
            "word": sign.word,
            "message": "Sinal cadastrado, mas ainda aguardando curadoria.",
            "sourceName": sign.source_name,
            "license": sign.license,
        }
    if sign.status != "approved":
        return {"status": "unavailable", "word": word, "message": "Sinal ainda não cadastrado."}
    payload = _approved_sign_payload(sign)
    return {"status": "approved", **payload, "sign": payload}


@router.post("/signs/manual", response_model=SignRead)
def create_manual_sign(
    payload: ManualSignCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    normalizer = TextNormalizerService()
    normalized_word = normalizer.normalize_word(payload.word)
    statement = select(Sign).where(Sign.normalized_word == normalized_word)
    if payload.gloss:
        statement = statement.where(Sign.gloss == payload.gloss)
    sign = db.scalar(statement.order_by(Sign.updated_at.desc()).limit(1))
    is_new_sign = sign is None
    old_value = _sign_snapshot(sign) if sign else None

    if not sign:
        sign = Sign(word=payload.word, normalized_word=normalized_word, status="pending")
        db.add(sign)

    sign.word = payload.word or sign.word
    sign.normalized_word = normalized_word
    sign.status = "pending"
    _set_if_present(sign, "gloss", payload.gloss)
    _set_if_present(sign, "example_sentence", payload.example_sentence)
    _set_if_present(sign, "hand_configuration", payload.handshape)
    _set_if_present(sign, "movement_description", payload.movement)
    _set_if_present(sign, "facial_expression", payload.facial_expression)
    _set_if_present(sign, "source_name", payload.source_name)
    _set_if_present(sign, "source_url", payload.source_url)
    _set_if_present(sign, "license", payload.license)
    _set_if_present(sign, "image_url", payload.image_url)
    _set_if_present(sign, "video_url", payload.avatar_video_url or payload.video_url)
    _set_if_present(sign, "avatar_gif_url", payload.avatar_gif_url)
    _set_if_present(sign, "avatar_animation_url", payload.animation_payload_url)
    description = _manual_description(payload)
    if description:
        sign.description = description
    sign.educational_notes = _manual_educational_notes(payload)
    sign.curator_notes = payload.curator_notes or sign.curator_notes
    sign.version = 1 if is_new_sign else (sign.version or 1) + 1
    db.flush()
    db.add(
        SignAuditLog(
            sign_id=sign.id,
            user_id=user.id,
            action="manual_create" if is_new_sign else "manual_update",
            old_value=old_value,
            new_value={
                "status": sign.status,
                "word": sign.word,
                "source_name": sign.source_name,
                "source_reference_url": _source_reference_url(sign),
            },
        )
    )
    db.commit()
    db.refresh(sign)
    return sign


@router.patch("/signs/{sign_id}/media", response_model=SignRead)
def update_sign_media(
    sign_id: int,
    payload: SignMediaUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")

    fields = payload.model_fields_set
    media_values = [
        payload.video_url if "video_url" in fields else None,
        payload.avatar_video_url if "avatar_video_url" in fields else None,
        payload.avatar_gif_url if "avatar_gif_url" in fields else None,
        payload.image_url if "image_url" in fields else None,
    ]
    for media_url in media_values:
        if media_url and not _is_http_url(media_url):
            raise HTTPException(status_code=422, detail="URLs de midia devem comecar com http:// ou https://.")

    effective_video = (
        payload.avatar_video_url
        if "avatar_video_url" in fields and payload.avatar_video_url
        else payload.video_url
        if "video_url" in fields and payload.video_url
        else sign.video_url
    )
    effective_gif = (
        payload.avatar_gif_url
        if "avatar_gif_url" in fields and payload.avatar_gif_url
        else sign.avatar_gif_url
    )
    effective_source_name = payload.source_name if "source_name" in fields and payload.source_name else sign.source_name
    effective_source_url = payload.source_url if "source_url" in fields and payload.source_url else sign.source_url
    effective_license = payload.license if "license" in fields and payload.license else sign.license
    effective_license_notes = payload.license_notes if "license_notes" in fields and payload.license_notes else _license_notes(sign)
    if (effective_video or effective_gif) and not (effective_source_name and effective_source_url and effective_license):
        raise HTTPException(status_code=422, detail="Midia autorizada exige fonte, URL da fonte e licenca.")
    if effective_gif and not effective_license_notes:
        raise HTTPException(status_code=422, detail="GIF autorizado exige observacao de autorizacao/licenca.")

    old_value = _sign_snapshot(sign)
    _set_if_provided(sign, "gloss", payload.gloss, "gloss" in fields)
    _set_if_provided(sign, "source_name", payload.source_name, "source_name" in fields)
    _set_if_provided(sign, "source_url", payload.source_url, "source_url" in fields)
    _set_if_provided(sign, "license", payload.license, "license" in fields)
    _set_if_provided(sign, "image_url", payload.image_url, "image_url" in fields)
    if "video_url" in fields:
        _set_if_provided(sign, "video_url", payload.video_url, True)
    if "avatar_video_url" in fields and payload.avatar_video_url:
        sign.video_url = payload.avatar_video_url
    _set_if_provided(sign, "avatar_gif_url", payload.avatar_gif_url, "avatar_gif_url" in fields)
    _set_if_provided(sign, "curator_notes", payload.curator_notes, "curator_notes" in fields)
    sign.educational_notes = _merge_educational_metadata(
        sign.educational_notes,
        source_reference_url=payload.source_reference_url if "source_reference_url" in fields else None,
        license_notes=payload.license_notes if "license_notes" in fields else None,
    )
    sign.version = (sign.version or 1) + 1
    db.flush()
    db.add(
        SignAuditLog(
            sign_id=sign.id,
            user_id=user.id,
            action="media_update",
            old_value=old_value,
            new_value=_sign_snapshot(sign),
        )
    )
    db.commit()
    db.refresh(sign)
    return sign


@router.patch("/signs/{sign_id}/curation", response_model=SignRead)
def curate_sign(
    sign_id: int,
    payload: SignCurationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    if payload.status == "approved":
        if not sign.source_name or not sign.source_url or not sign.license:
            raise HTTPException(status_code=422, detail="Nao e permitido aprovar sinal sem fonte, URL e licenca.")
        if (sign.video_url or sign.avatar_gif_url) and not _license_notes(sign):
            raise HTTPException(status_code=422, detail="Nao e permitido aprovar midia sem observacao de autorizacao/licenca.")
        if not sign.gloss and not sign.video_url and not sign.avatar_gif_url and not sign.avatar_animation_url:
            raise HTTPException(status_code=422, detail="Nao e permitido aprovar sinal sem video, GIF, animacao ou glosa.")
    old_value = _sign_snapshot(sign)
    sign.status = payload.status
    sign.curator_notes = payload.curator_notes or sign.curator_notes
    sign.last_reviewed_at = utc_now()
    if payload.status == "approved":
        sign.approved_by_user_id = user.id
        sign.approved_at = utc_now()
    if payload.status == "rejected":
        sign.rejected_by_user_id = user.id
        sign.rejected_at = utc_now()
    sign.version += 1
    db.add(
        SignAuditLog(
            sign_id=sign.id,
            user_id=user.id,
            action="curation",
            old_value=old_value,
            new_value={"status": sign.status, "curator_notes": sign.curator_notes},
        )
    )
    db.commit()
    db.refresh(sign)
    return sign


@router.patch("/signs/{sign_id}", response_model=SignRead)
def update_sign(
    sign_id: int,
    payload: SignUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    old_value = {field: getattr(sign, field) for field in payload.model_dump(exclude_unset=True)}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sign, field, value)
    sign.version += 1
    db.add(SignAuditLog(sign_id=sign.id, user_id=user.id, action="update", old_value=old_value, new_value=payload.model_dump(exclude_unset=True)))
    db.commit()
    db.refresh(sign)
    return sign


@router.post("/signs/{sign_id}/approve", response_model=SignRead)
def approve_sign(
    sign_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    if not sign.source_name or not sign.source_url or not sign.license or sign.license.strip().lower() == "aguardando curadoria":
        raise HTTPException(status_code=422, detail="Nao e permitido aprovar sinal sem fonte, URL e licenca validas.")
    if (sign.video_url or sign.avatar_gif_url) and not _license_notes(sign):
        raise HTTPException(status_code=422, detail="Nao e permitido aprovar midia sem observacao de autorizacao/licenca.")
    if not sign.gloss and not sign.video_url and not sign.avatar_gif_url and not sign.avatar_animation_url:
        raise HTTPException(status_code=422, detail="Nao e permitido aprovar sinal sem video, GIF, animacao ou glosa.")
    old_value = {"status": sign.status}
    sign.status = "approved"
    sign.curator_notes = sign.curator_notes or "Aprovado por administrador/curador."
    sign.approved_by_user_id = user.id
    sign.approved_at = utc_now()
    sign.last_reviewed_at = utc_now()
    sign.version += 1
    db.add(SignAuditLog(sign_id=sign.id, user_id=user.id, action="approve", old_value=old_value, new_value={"status": sign.status}))
    db.commit()
    db.refresh(sign)
    return sign


@router.post("/signs/{sign_id}/reject", response_model=SignRead)
def reject_sign(
    sign_id: int,
    payload: RejectSignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    old_value = {"status": sign.status}
    sign.status = "rejected"
    sign.rejected_by_user_id = user.id
    sign.rejected_at = utc_now()
    sign.curator_notes = payload.reason
    sign.version += 1
    db.add(SignAuditLog(sign_id=sign.id, user_id=user.id, action="reject", old_value=old_value, new_value={"status": sign.status, "reason": payload.reason}))
    db.commit()
    db.refresh(sign)
    return sign


@router.get("/signs/{sign_id}/audit")
def sign_audit_log(
    sign_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["admin", "curator"])),
):
    sign = db.get(Sign, sign_id)
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    logs = list(db.scalars(select(SignAuditLog).where(SignAuditLog.sign_id == sign_id).order_by(SignAuditLog.created_at.desc())))
    return [
        {
            "id": item.id,
            "user_id": item.user_id,
            "action": item.action,
            "old_value": item.old_value,
            "new_value": item.new_value,
            "created_at": item.created_at,
        }
        for item in logs
    ]


@router.get("/admin/stats", response_model=AdminStats)
def admin_stats(db: Session = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    stats = SignRepository(db).stats_by_status()
    total_signs = db.scalar(select(func.count(Sign.id))) or 0
    import_jobs = db.scalar(select(func.count(ImportJob.id))) or 0
    avatar_media_filter = or_(Sign.video_url.is_not(None), Sign.avatar_gif_url.is_not(None))
    any_media_filter = or_(Sign.video_url.is_not(None), Sign.avatar_gif_url.is_not(None), Sign.image_url.is_not(None))
    no_video_signs = db.scalar(select(func.count(Sign.id)).where(~any_media_filter)) or 0
    pending_with_video_signs = db.scalar(select(func.count(Sign.id)).where(Sign.status == "pending", avatar_media_filter)) or 0
    approved_with_video_signs = db.scalar(select(func.count(Sign.id)).where(Sign.status == "approved", avatar_media_filter)) or 0
    needs_curation_signs = db.scalar(select(func.count(Sign.id)).where(Sign.status.in_(["pending", "review", "needs_specialist_review"]))) or 0
    return AdminStats(
        total_signs=total_signs,
        approved_signs=stats.get("approved", 0),
        pending_signs=stats.get("pending", 0),
        rejected_signs=stats.get("rejected", 0),
        review_signs=stats.get("review", 0),
        import_jobs=import_jobs,
        no_video_signs=no_video_signs,
        pending_with_video_signs=pending_with_video_signs,
        approved_with_video_signs=approved_with_video_signs,
        ready_for_avatar_signs=approved_with_video_signs,
        needs_curation_signs=needs_curation_signs,
    )


@router.post("/admin/import", response_model=ImportJobRead)
def import_dictionary(
    payload: ImportRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["admin"])),
):
    importer = LibrasDictionaryImporter(db)
    if payload.source_type == "csv":
        return importer.import_from_csv(payload.source)
    if payload.source_type == "json":
        return importer.import_from_json(payload.source)
    return importer.import_from_api(payload.provider_name or payload.source)


@router.post("/admin/import/ines-media/validate", response_model=InesMediaImportJobResponse)
def validate_ines_media_import(
    payload: InesMediaImportStartRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["admin"])),
):
    report = InesMediaImporter(db).validate(payload)
    return {"job_id": None, "status": "validated", "report": report}


@router.post("/admin/import/ines-media/start", response_model=InesMediaImportJobResponse)
def start_ines_media_import(
    payload: InesMediaImportStartRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin"])),
):
    settings = get_settings()
    if not settings.ines_import_enabled:
        raise HTTPException(status_code=403, detail="Importação INES desativada neste ambiente.")
    try:
        job, report = InesMediaImporter(db).run(payload, user)
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"job_id": job.id, "status": job.status, "report": report}


@router.post("/admin/import/ines-media/auto-pending", response_model=InesMediaImportJobResponse)
def auto_import_pending_ines_media(
    payload: InesMediaAutoPendingRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin"])),
):
    settings = get_settings()
    if not settings.ines_import_enabled:
        raise HTTPException(status_code=403, detail="Importação INES desativada neste ambiente.")
    try:
        job, report = InesMediaImporter(db).auto_import_pending_words(
            user=user,
            max_items=payload.max_items,
            approve_authorized=payload.approve_authorized,
            overwrite=payload.overwrite,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"job_id": job.id, "status": job.status, "report": report}


@router.post("/admin/import/ines-media/auto-selected", response_model=InesMediaImportJobResponse)
def auto_import_selected_ines_media(
    payload: InesMediaAutoSelectedRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin"])),
):
    settings = get_settings()
    if not settings.ines_import_enabled:
        raise HTTPException(status_code=403, detail="Importação INES desativada neste ambiente.")
    try:
        job, report = InesMediaImporter(db).auto_import_selected_words(
            payload.words,
            user=user,
            max_items=payload.max_items,
            approve_authorized=payload.approve_authorized,
            overwrite=payload.overwrite,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"job_id": job.id, "status": job.status, "report": report}


@router.post("/admin/import/ines-media/diagnose", response_model=InesMediaDiagnoseResponse)
def diagnose_ines_media_import(
    payload: InesMediaDiagnoseRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["admin"])),
):
    settings = get_settings()
    if not settings.ines_import_enabled:
        raise HTTPException(status_code=403, detail="Importação INES desativada neste ambiente.")
    return InesMediaImporter(db).diagnose_words(payload.words, payload.max_items)


@router.get("/admin/import/ines-media/{job_id}", response_model=InesMediaImportJobResponse)
def get_ines_media_import_job(
    job_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["admin"])),
):
    job = db.get(ImportJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job de importação não encontrado.")
    report = _import_job_report(job)
    return {"job_id": job.id, "status": job.status, "report": report}


@router.post("/admin/import/ines-media", response_model=ImportJobRead)
def import_ines_authorized_media(
    payload: InesMediaImportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin"])),
):
    if not get_settings().ines_import_enabled:
        raise HTTPException(status_code=403, detail="Importação INES desativada neste ambiente.")
    importer = InesAuthorizedMediaImporter(db)
    if payload.records is not None:
        return importer.import_records(
            payload.records,
            source_name=payload.source,
            source_type=payload.source_type,
            download_media=payload.download_media,
            overwrite_files=payload.overwrite_files,
            authorized=payload.authorized,
            authorization_reference=payload.authorization_reference,
            user=user,
        )
    if payload.content:
        return importer.import_content(
            payload.content,
            source_name=payload.source,
            source_type=payload.source_type,
            download_media=payload.download_media,
            overwrite_files=payload.overwrite_files,
            authorized=payload.authorized,
            authorization_reference=payload.authorization_reference,
            user=user,
        )
    return importer.import_manifest(
        payload.source,
        payload.source_type,
        download_media=payload.download_media,
        overwrite_files=payload.overwrite_files,
        authorized=payload.authorized,
        authorization_reference=payload.authorization_reference,
        user=user,
    )


@router.post("/admin/import/libras-gif-media", response_model=InesMediaImportJobResponse)
def import_libras_gif_media(
    payload: LibrasGifMediaImportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(["admin"])),
):
    settings = get_settings()
    limit = min(len(payload.items), max(1, settings.ines_import_max_items))
    report = _empty_media_import_report(total_items=limit)
    if len(payload.items) > limit:
        report["warnings"].append(
            {
                "word": None,
                "message": f"Total enviado ({len(payload.items)}) excede o limite desta execucao ({limit}). O excedente foi ignorado.",
            }
        )
    if payload.approve_authorized:
        report["warnings"].append(
            {
                "word": None,
                "message": "GIFs importados por manifesto permanecem pending; aprove manualmente apos validacao por especialista.",
            }
        )

    job = ImportJob(
        source_type="json",
        source_name=f"Libras GIF media import: {payload.source_name}",
        status="running",
        total_records=limit,
        logs=[
            {
                "level": "settings",
                "row": None,
                "message": "Importacao administrativa de GIFs iniciada sob demanda por admin.",
                "settings": {
                    "source_name": payload.source_name,
                    "source_url": payload.source_url,
                    "max_items": limit,
                    "approve_authorized": payload.approve_authorized,
                    "overwrite": payload.overwrite,
                    "store_remote_url": True,
                    "download_media": False,
                },
            }
        ],
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    normalizer = TextNormalizerService()
    seen: set[str] = set()
    for index, item in enumerate(payload.items[:limit], start=1):
        word = _clean_value(item.word)
        normalized_word = normalizer.normalize_word(word or "")
        if not word:
            _record_import_error(db, job, report, index, None, "Item sem palavra.")
            continue
        if normalized_word in seen:
            report["skipped_count"] += 1
            _append_import_log(job, "warning", index, f"{word}: duplicado no lote.")
            continue
        seen.add(normalized_word)

        try:
            gif_url = _clean_value(item.avatar_gif_url or item.gif_url)
            image_url = _clean_value(item.image_url)
            source_name = _clean_value(item.source_name) or payload.source_name
            source_url = _clean_value(item.source_url) or payload.source_url
            source_reference_url = _clean_value(item.source_reference_url) or source_url
            license_text = _clean_value(item.license)
            license_notes = _clean_value(item.license_notes)

            if not gif_url:
                _record_import_error(db, job, report, index, word, "Item sem avatar_gif_url/gif_url.")
                continue
            for key, value in {"avatar_gif_url": gif_url, "image_url": image_url, "source_url": source_url, "source_reference_url": source_reference_url}.items():
                if value and not _is_http_url(value):
                    raise ValueError(f"{key} deve comecar com http:// ou https://.")
            if not (source_name and source_url and license_text and license_notes):
                raise ValueError("GIF autorizado exige fonte, URL da fonte, licenca e observacoes de licenca.")

            sign = db.scalar(select(Sign).where(Sign.normalized_word == normalized_word).order_by(Sign.updated_at.desc()).limit(1))
            if sign and sign.status == "approved" and not payload.overwrite:
                report["skipped_count"] += 1
                report["warnings"].append({"word": word, "message": "Sinal aprovado existente nao foi sobrescrito."})
                _append_import_log(job, "warning", index, f"{word}: sinal aprovado nao sobrescrito.")
                db.commit()
                continue

            created = sign is None
            old_value = _sign_snapshot(sign)
            if not sign:
                sign = Sign(word=word, normalized_word=normalized_word, status="pending")
                db.add(sign)
                db.flush()

            sign.word = word
            sign.normalized_word = normalized_word
            sign.gloss = _clean_value(item.gloss) or sign.gloss
            sign.avatar_gif_url = gif_url
            if image_url:
                sign.image_url = image_url
            sign.source_name = source_name
            sign.source_url = source_url
            sign.license = license_text
            sign.curator_notes = _clean_value(item.curator_notes) or "GIF autorizado cadastrado como midia complementar; aguardando curadoria."
            sign.educational_notes = _merge_educational_metadata(
                sign.educational_notes,
                source_reference_url=source_reference_url,
                license_notes=license_notes,
            )
            sign.status = "pending"
            sign.version = (sign.version or 1) + 1
            db.flush()
            db.add(
                SignAuditLog(
                    sign_id=sign.id,
                    user_id=user.id,
                    action="gif_media_import",
                    old_value=old_value,
                    new_value=_sign_snapshot(sign),
                )
            )
            report["processed_items"] += 1
            report["video_found_count"] += 1
            report["pending_count"] += 1
            if created:
                report["created_count"] += 1
                job.imported_records += 1
            else:
                report["updated_count"] += 1
                job.updated_records += 1
            report["items"].append(
                {
                    "word": sign.word,
                    "status": sign.status,
                    "video_found": False,
                    "avatar_gif_url": sign.avatar_gif_url,
                    "source_reference_url": source_reference_url,
                    "image_url": sign.image_url,
                    "reason": "GIF autorizado vinculado como midia complementar.",
                    "recommended_action": "Revisar e aprovar manualmente",
                    "warnings": [],
                    "errors": [],
                }
            )
            _append_import_log(job, "success", index, f"{sign.word}: GIF vinculado com status pending.")
            db.commit()
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            _record_import_error(db, job, report, index, word, str(exc))

    job.status = "completed"
    job.failed_records = report["error_count"]
    job.finished_at = utc_now()
    _append_import_log(job, "report", None, "Relatorio final da importacao de GIFs.", report=report)
    db.commit()
    db.refresh(job)
    return {"job_id": job.id, "status": job.status, "report": report}


@router.get("/admin/import-jobs", response_model=list[ImportJobRead])
def list_import_jobs(db: Session = Depends(get_db), _: User = Depends(require_role(["admin"]))):
    return list(db.scalars(select(ImportJob).order_by(ImportJob.created_at.desc()).limit(50)))


@router.post("/saved-words")
def save_word(
    payload: SavedWordCreate,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    sign = db.get(Sign, payload.sign_id) if payload.sign_id else None
    if not sign and payload.word:
        normalized_word = TextNormalizerService().normalize_word(payload.word)
        sign = db.scalar(select(Sign).where(Sign.normalized_word == normalized_word).limit(1))
    if not sign:
        raise HTTPException(status_code=404, detail="Sinal nao encontrado.")
    class_session_id = payload.class_session_id
    if not class_session_id and payload.access_code:
        class_session = db.scalar(select(ClassSession).where(ClassSession.access_code == payload.access_code.upper()))
        class_session_id = class_session.id if class_session else None
    user = current_user
    # Anonymous students should keep saved words on the device in production.
    if not user and not get_settings().demo_mode:
        return {"id": 0, "word": sign.word, "status": "local-only"}
    if not user:
        user = db.scalar(select(User).where(User.email == payload.user_email))
    if not user:
        user = User(
            name=payload.user_name,
            email=payload.user_email,
            password_hash=hash_password("demo-student-password"),
            role=UserRole.student.value,
        )
        db.add(user)
        db.flush()
    saved = SavedWord(
        user_id=user.id,
        sign_id=sign.id,
        class_session_id=class_session_id,
        notes=payload.notes,
    )
    db.add(saved)
    db.commit()
    return {"id": saved.id, "word": sign.word, "status": "saved"}


def _set_if_present(sign: Sign, field: str, value: str | None) -> None:
    if value is not None and str(value).strip():
        setattr(sign, field, value)


def _set_if_provided(sign: Sign, field: str, value: str | None, provided: bool) -> None:
    if provided and value is not None and str(value).strip():
        setattr(sign, field, value.strip() if isinstance(value, str) else value)


def _is_http_url(value: str) -> bool:
    return value.startswith("http://") or value.startswith("https://")


def _manual_description(payload: ManualSignCreate) -> str:
    lines = []
    if payload.meaning:
        lines.append(f"Acepção/significado: {payload.meaning}")
    if payload.grammatical_class:
        lines.append(f"Classe gramatical: {payload.grammatical_class}")
    if payload.location:
        lines.append(f"Localização: {payload.location}")
    if payload.orientation:
        lines.append(f"Orientação: {payload.orientation}")
    return "\n".join(lines)


def _manual_educational_notes(payload: ManualSignCreate) -> str:
    lines = [
        "Cadastro manual baseado em consulta ao Dicionário INES.",
        "Uso de vídeo autorizado para o projeto LibrasLive Edu quando URL de mídia for informada.",
    ]
    if payload.license_notes:
        lines.append(f"Observações de licença: {payload.license_notes}")
    if payload.source_reference_url:
        lines.append(f"URL consultada: {payload.source_reference_url}")
    if payload.avatar_video_url:
        lines.append("URL de avatar/vídeo próprio informada manualmente.")
    if payload.avatar_gif_url:
        lines.append("URL de GIF complementar informada manualmente.")
    if payload.animation_payload_url:
        lines.append("Payload de animação informado manualmente.")
    return "\n".join(lines)


def _sign_snapshot(sign: Sign | None) -> dict | None:
    if not sign:
        return None
    return {
        "word": sign.word,
        "gloss": sign.gloss,
        "status": sign.status,
        "source_name": sign.source_name,
        "source_url": sign.source_url,
        "source_reference_url": _source_reference_url(sign),
        "license": sign.license,
        "license_notes": _license_notes(sign),
        "video_url": sign.video_url,
        "avatar_gif_url": sign.avatar_gif_url,
        "image_url": sign.image_url,
    }


def _metadata_value(sign: Sign, label: str) -> str | None:
    notes = sign.educational_notes or ""
    prefix = f"{label}:"
    for line in notes.splitlines():
        if line.strip().startswith(prefix):
            value = line.split(":", 1)[1].strip()
            return value or None
    return None


def _source_reference_url(sign: Sign) -> str | None:
    return _metadata_value(sign, "URL consultada") or sign.source_url


def _license_notes(sign: Sign) -> str | None:
    return _metadata_value(sign, "Observações de licença")


def _merge_educational_metadata(
    notes: str | None,
    *,
    source_reference_url: str | None = None,
    license_notes: str | None = None,
) -> str:
    existing = []
    for line in (notes or "").splitlines():
        if not line.startswith("URL consultada:") and not line.startswith("Observações de licença:"):
            existing.append(line)
    if not existing:
        existing.extend(
            [
                "Mídia cadastrada manualmente por curadoria autorizada.",
                "Sinal permanece no status atual até revisão por admin/curador.",
            ]
        )
    if license_notes:
        existing.append(f"Observações de licença: {license_notes}")
    elif notes and _metadata_value_from_notes(notes, "Observações de licença"):
        existing.append(f"Observações de licença: {_metadata_value_from_notes(notes, 'Observações de licença')}")
    if source_reference_url:
        existing.append(f"URL consultada: {source_reference_url}")
    elif notes and _metadata_value_from_notes(notes, "URL consultada"):
        existing.append(f"URL consultada: {_metadata_value_from_notes(notes, 'URL consultada')}")
    return "\n".join(existing)


def _metadata_value_from_notes(notes: str, label: str) -> str | None:
    prefix = f"{label}:"
    for line in notes.splitlines():
        if line.strip().startswith(prefix):
            value = line.split(":", 1)[1].strip()
            return value or None
    return None


def _import_job_report(job: ImportJob) -> dict:
    for item in reversed(job.logs or []):
        if item.get("level") == "report" and isinstance(item.get("report"), dict):
            return item["report"]
    return {
        "total_items": job.total_records,
        "processed_items": max(0, job.imported_records + job.updated_records),
        "created_count": job.imported_records,
        "updated_count": job.updated_records,
        "approved_count": 0,
        "pending_count": max(0, job.imported_records + job.updated_records),
        "skipped_count": 0,
        "error_count": job.failed_records,
        "video_found_count": 0,
        "video_missing_count": job.failed_records,
        "errors": [
            {"word": None, "message": item.get("message", "")}
            for item in job.logs or []
            if item.get("level") == "error"
        ],
        "warnings": [
            {"word": None, "message": item.get("message", "")}
            for item in job.logs or []
            if item.get("level") == "warning"
        ],
        "items": [],
        "manual_required": [],
    }


def _empty_media_import_report(*, total_items: int = 0) -> dict:
    return {
        "total_items": total_items,
        "processed_items": 0,
        "created_count": 0,
        "updated_count": 0,
        "approved_count": 0,
        "pending_count": 0,
        "skipped_count": 0,
        "error_count": 0,
        "video_found_count": 0,
        "video_missing_count": 0,
        "errors": [],
        "warnings": [],
        "items": [],
        "manual_required": [],
    }


def _append_import_log(job: ImportJob, level: str, row: int | None, message: str, **extra) -> None:
    logs = list(job.logs or [])
    entry = {"level": level, "row": row, "message": message}
    entry.update(extra)
    logs.append(entry)
    job.logs = logs


def _record_import_error(db: Session, job: ImportJob, report: dict, row: int | None, word: str | None, message: str) -> None:
    report["error_count"] += 1
    report["video_missing_count"] += 1
    report["errors"].append({"word": word, "message": message})
    report["items"].append(
        {
            "word": word or "registro",
            "status": "error",
            "video_found": False,
            "reason": message,
            "recommended_action": "Revisar manifesto e importar novamente",
            "warnings": [],
            "errors": [message],
        }
    )
    job.failed_records = report["error_count"]
    _append_import_log(job, "error", row, f"{word or 'registro'}: {message}")
    db.commit()


def _clean_value(value) -> str | None:
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def _approved_sign_payload(sign: Sign) -> dict:
    return {
        "id": sign.id,
        "word": sign.word,
        "normalizedWord": sign.normalized_word,
        "gloss": sign.gloss,
        "description": sign.description,
        "exampleSentence": sign.example_sentence,
        "imageUrl": sign.image_url,
        "videoUrl": sign.video_url,
        "avatarVideoUrl": sign.video_url,
        "avatarGifUrl": sign.avatar_gif_url,
        "animationPayloadUrl": sign.avatar_animation_url,
        "sourceName": sign.source_name,
        "sourceUrl": sign.source_url,
        "sourceReferenceUrl": _source_reference_url(sign),
        "license": sign.license,
        "licenseNotes": _license_notes(sign),
        "status": sign.status,
    }
