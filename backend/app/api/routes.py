import os
import uuid
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from app.core.config import settings
from app.core.database import get_db
from app.models.case import Case, CaseStatusHistory, VeterinaryService, CaseAssignment
from app.schemas.case import (
    CaseCreateRequest, CaseResponse, CaseStatusUpdateRequest,
    CaseAssignRequest, VeterinaryServiceResponse, AnalyticsSummary,
    TriageResult
)
from app.services.triage.engine import evaluate_triage
from app.services.gnani.factory import get_speech_provider, get_reasoning_provider, get_voice_provider

router = APIRouter(prefix="/api")

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "JeevSetu Backend",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@router.get("/integrations/status")
async def integration_status():
    has_api_key = bool(settings.GNANI_API_KEY)
    return {
        "provider_mode": settings.AI_PROVIDER_MODE,
        "gnani": {
            "api_key_configured": has_api_key,
            "base_url": settings.GNANI_API_BASE_URL,
            "prisma_model": settings.GNANI_PRISMA_MODEL,
            "prisma_status": "live" if (has_api_key and settings.AI_PROVIDER_MODE == "live") else "demo_mode",
            "evon_model": settings.GNANI_EVON_MODEL,
            "evon_status": "live" if (has_api_key and settings.AI_PROVIDER_MODE == "live") else "demo_mode",
            "timbre_model": settings.GNANI_TIMBRE_MODEL,
            "timbre_status": "live" if (has_api_key and settings.AI_PROVIDER_MODE == "live") else "demo_mode"
        },
        "database": {
            "engine": "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql",
            "status": "connected"
        },
        "safety_engine": {
            "version": settings.TRIAGE_RULESET_VERSION,
            "status": "active_deterministic"
        }
    }

@router.post("/audio/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = Form("odia")
):
    # Validate file type
    content_type = file.content_type or ""
    if not (content_type.startswith("audio/") or file.filename.endswith((".wav", ".mp3", ".webm", ".ogg", ".m4a"))):
        raise HTTPException(status_code=400, detail="Invalid audio file format.")

    # Read bytes and persist locally
    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file exceeds 25MB limit.")

    os.makedirs(settings.AUDIO_STORAGE_PATH, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] or ".webm"
    storage_name = f"rec_{uuid.uuid4().hex[:12]}{ext}"
    storage_path = os.path.join(settings.AUDIO_STORAGE_PATH, storage_name)

    with open(storage_path, "wb") as f:
        f.write(audio_bytes)

    # Transcribe via speech provider
    provider = get_speech_provider()
    try:
        result = await provider.transcribe(audio_bytes, file.filename, language_hint=language)
        result["audio_object_key"] = storage_name
        return result
    except Exception as e:
        # Keep intake available when the optional live provider is unavailable.
        from app.services.gnani.demo_providers import DemoSpeechProvider
        fallback = DemoSpeechProvider()
        res = await fallback.transcribe(audio_bytes, file.filename, language_hint=language)
        res["audio_object_key"] = storage_name
        res["note"] = f"Live transcription failed ({str(e)}). Fell back to DEMO MODE."
        res["live_provider_error"] = type(e).__name__
        return res

@router.post("/cases/extract")
async def extract_symptoms(payload: dict):
    transcript = payload.get("transcript", "")
    animal_type = payload.get("animal_type", "cow")
    language = payload.get("language", "odia")
    input_mode = payload.get("input_mode", "voice")

    provider = get_reasoning_provider()
    try:
        result = await provider.extract_case(transcript, {
            "animal_type": animal_type,
            "language": language,
            "input_mode": input_mode
        })
        return result
    except Exception as e:
        if settings.AI_PROVIDER_MODE == "live":
            raise HTTPException(status_code=502, detail="Live symptom extraction failed.") from e
        from app.services.gnani.demo_providers import DemoReasoningProvider
        fallback = DemoReasoningProvider()
        res = await fallback.extract_case(transcript, {"animal_type": animal_type, "language": language, "input_mode": input_mode})
        res["note"] = f"Live extraction error ({str(e)}). Returned DEMO extraction."
        return res

@router.post("/cases/triage", response_model=TriageResult)
async def triage_case(payload: dict):
    transcript = payload.get("transcript")
    symptoms = payload.get("symptoms", [])
    eating_change = payload.get("eating_change")
    duration = payload.get("duration")

    return evaluate_triage(
        transcript=transcript,
        symptoms=symptoms,
        eating_change=eating_change,
        duration=duration
    )

@router.post("/cases", response_model=CaseResponse)
async def create_case(case_in: CaseCreateRequest, db: AsyncSession = Depends(get_db)):
    # Generate public reference code like JS-2026-XXXX
    rand_code = random.randint(1000, 9999)
    public_ref = f"JS-2026-{rand_code}"

    new_case = Case(
        public_reference=public_ref,
        animal_type=case_in.animal_type,
        animal_identifier=case_in.animal_identifier,
        animal_age_group=case_in.animal_age_group,
        is_milking=case_in.is_milking,
        language=case_in.language,
        transcript=case_in.transcript,
        audio_object_key=case_in.audio_object_key,
        audio_consent=case_in.audio_consent,
        symptom_extraction_json=case_in.symptom_extraction,
        urgency_level=case_in.urgency_level,
        urgency_reasons_json=case_in.urgency_reasons,
        district=case_in.district,
        block=case_in.block,
        village=case_in.village,
        landmark=case_in.landmark,
        latitude=case_in.latitude,
        longitude=case_in.longitude,
        farmer_name=case_in.farmer_name,
        farmer_phone=case_in.farmer_phone,
        contact_consent=case_in.contact_consent,
        status="new",
        input_mode=case_in.input_mode,
        processing_source=case_in.processing_source,
        is_demo_record=case_in.is_demo_record or (settings.AI_PROVIDER_MODE == "demo")
    )
    db.add(new_case)
    await db.flush()

    # Create initial status history entry
    history = CaseStatusHistory(
        case_id=new_case.id,
        previous_status=None,
        new_status="new",
        reason="Case submitted by farmer / livestock keeper",
        changed_by="Farmer System Intake"
    )
    db.add(history)
    await db.commit()
    await db.refresh(new_case)

    # Fetch with relationships
    stmt = select(Case).where(Case.id == new_case.id)
    res = await db.execute(stmt)
    return res.scalar_one()

@router.get("/cases", response_model=list[CaseResponse])
async def list_cases(
    status: str | None = None,
    urgency: str | None = None,
    animal_type: str | None = None,
    district: str | None = None,
    search: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    query = select(Case).order_by(desc(Case.created_at)).limit(limit).offset(offset)
    
    if status and status != "all":
        query = query.where(Case.status == status)
    if urgency and urgency != "all":
        query = query.where(Case.urgency_level == urgency)
    if animal_type and animal_type != "all":
        query = query.where(Case.animal_type == animal_type)
    if district and district != "all":
        query = query.where(Case.district == district)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Case.public_reference.ilike(search_filter)) |
            (Case.village.ilike(search_filter)) |
            (Case.district.ilike(search_filter)) |
            (Case.transcript.ilike(search_filter))
        )

    res = await db.execute(query)
    return res.scalars().all()

@router.get("/cases/{case_id}", response_model=CaseResponse)
async def get_case_detail(case_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Case).where((Case.id == case_id) | (Case.public_reference == case_id))
    res = await db.execute(stmt)
    case_obj = res.scalar_one_or_none()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case record not found.")
    return case_obj

@router.patch("/cases/{case_id}/status", response_model=CaseResponse)
async def update_case_status(
    case_id: str,
    payload: CaseStatusUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Case).where((Case.id == case_id) | (Case.public_reference == case_id))
    res = await db.execute(stmt)
    case_obj = res.scalar_one_or_none()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case record not found.")

    prev = case_obj.status
    case_obj.status = payload.status
    case_obj.updated_at = datetime.utcnow()

    # Append to status history
    history = CaseStatusHistory(
        case_id=case_obj.id,
        previous_status=prev,
        new_status=payload.status,
        reason=payload.reason or f"Status updated to {payload.status}",
        changed_by=payload.changed_by
    )
    db.add(history)
    await db.commit()
    await db.refresh(case_obj)
    return case_obj

@router.post("/cases/{case_id}/assign")
async def assign_case(
    case_id: str,
    payload: CaseAssignRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Case).where((Case.id == case_id) | (Case.public_reference == case_id))
    res = await db.execute(stmt)
    case_obj = res.scalar_one_or_none()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case record not found.")

    vet_stmt = select(VeterinaryService).where(VeterinaryService.id == payload.veterinary_service_id)
    vet_res = await db.execute(vet_stmt)
    vet_obj = vet_res.scalar_one_or_none()
    if not vet_obj:
        raise HTTPException(status_code=404, detail="Veterinary service not found.")

    assignment = CaseAssignment(
        case_id=case_obj.id,
        veterinary_service_id=vet_obj.id,
        assigned_operator=payload.assigned_operator,
        assignment_status="assigned"
    )
    db.add(assignment)

    # Transition case status to assigned
    prev = case_obj.status
    case_obj.status = "assigned"
    history = CaseStatusHistory(
        case_id=case_obj.id,
        previous_status=prev,
        new_status="assigned",
        reason=f"Assigned to {vet_obj.name} ({vet_obj.district})",
        changed_by=payload.assigned_operator
    )
    db.add(history)
    await db.commit()

    return {
        "status": "success",
        "case_id": case_obj.id,
        "assigned_to": vet_obj.name,
        "assigned_at": assignment.assigned_at.isoformat()
    }

@router.get("/veterinary-services", response_model=list[VeterinaryServiceResponse])
async def list_veterinary_services(
    district: str | None = None,
    service_type: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(VeterinaryService)
    if district and district != "all":
        query = query.where(VeterinaryService.district == district)
    if service_type and service_type != "all":
        query = query.where(VeterinaryService.service_type == service_type)

    res = await db.execute(query)
    return res.scalars().all()

@router.get("/analytics/summary", response_model=AnalyticsSummary)
async def get_analytics_summary(db: AsyncSession = Depends(get_db)):
    cases_res = await db.execute(select(Case))
    all_cases = cases_res.scalars().all()

    total = len(all_cases)
    new_c = sum(1 for c in all_cases if c.status == "new")
    urgent_c = sum(1 for c in all_cases if c.urgency_level == "urgent")
    review_c = sum(1 for c in all_cases if c.status in ["under_review", "new"])
    resolved_c = sum(1 for c in all_cases if c.status == "resolved")

    by_animal: dict[str, int] = {}
    by_district: dict[str, int] = {}
    by_urgency: dict[str, int] = {}
    by_lang: dict[str, int] = {}

    for c in all_cases:
        by_animal[c.animal_type] = by_animal.get(c.animal_type, 0) + 1
        d = c.district or "Unspecified"
        by_district[d] = by_district.get(d, 0) + 1
        by_urgency[c.urgency_level] = by_urgency.get(c.urgency_level, 0) + 1
        by_lang[c.language] = by_lang.get(c.language, 0) + 1

    return AnalyticsSummary(
        total_cases=total,
        new_cases=new_c,
        urgent_cases=urgent_c,
        under_review_cases=review_c,
        resolved_cases=resolved_c,
        by_animal=by_animal,
        by_district=by_district,
        by_urgency=by_urgency,
        by_language=by_lang,
        data_source_label="Live database records"
    )

@router.get("/audio/{filename}")
async def get_audio_file(filename: str):
    # Sanitize filename
    safe_name = os.path.basename(filename)
    path = os.path.join(settings.AUDIO_STORAGE_PATH, safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Audio file not found.")
    return FileResponse(path)
