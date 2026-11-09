import os
import re
import uuid
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, update
from app.core.config import settings
from app.core.database import get_db
from app.models.case import Case, CaseStatusHistory, VeterinaryService, CaseAssignment
from app.schemas.case import (
    CaseCreateRequest, CaseResponse, CaseStatusUpdateRequest,
    CaseAssignRequest, VeterinaryServiceResponse, AnalyticsSummary,
    TriageResult, TTSGenerateRequest, TTSGenerateResponse,
    AppendRecordingResponse, ConfirmCaseRequest, ConfirmCaseResponse
)
from app.services.triage.engine import evaluate_triage
from app.services.ai_factory import (
    get_speech_provider,
    get_reasoning_provider,
    get_voice_provider,
    provider_mode,
)
from app.services.language_service import ensure_selected_language
from app.services.storage import get_audio_storage
from app.services.bhashini_service import BhashiniError, get_bhashini_client
from app.services.evon_service import EvonError

router = APIRouter(prefix="/api")


def _merge_symptoms(
    existing: list[dict], new: list[dict]
) -> list[dict]:
    """Merge symptom lists, deduplicating by value while preserving conflicts."""
    merged: list[dict] = []
    seen_values: set[str] = set()

    def _add(sym: dict):
        val = sym.get("value", "").strip().lower()
        if not val or val in seen_values:
            return
        seen_values.add(val)
        merged.append(sym)

    for sym in existing or []:
        _add(sym)
    for sym in new or []:
        _add(sym)
    return merged


def _merge_string_lists(
    existing: list[str] | None, new: list[str] | None
) -> list[str]:
    """Merge string lists, deduplicating while preserving order."""
    merged: list[str] = []
    seen: set[str] = set()
    for item in (existing or []) + (new or []):
        if item and item not in seen:
            seen.add(item)
            merged.append(item)
    return merged

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
    bhashini_client = get_bhashini_client()
    evon_live = bool(settings.EVON_API_URL and settings.EVON_API_KEY)
    return {
        "provider_mode": settings.AI_PROVIDER_MODE,
        "evon": {
            "api_key_configured": bool(settings.EVON_API_KEY),
            "api_url": settings.EVON_API_URL,
            "model": settings.EVON_MODEL,
            "status": "live" if evon_live else "not_configured",
        },
        "bhashini": {
            "api_key_configured": bool(settings.BHASHINI_API_KEY),
            "asr_url": settings.BHASHINI_ASR_URL,
            "translation_url": settings.BHASHINI_TRANSLATION_URL,
            "tts_url": settings.BHASHINI_TTS_URL,
            "asr_status": "live" if bhashini_client.asr_configured else "not_configured",
            "translation_status": "live" if bhashini_client.translation_configured else "not_configured",
            "tts_status": "live" if bhashini_client.tts_configured else "not_configured",
        },
        "reasoning": {
            "provider": "evon",
            "model": settings.EVON_MODEL,
            "status": "live" if evon_live else "not_configured",
        },
        "database": {
            "engine": "sqlite" if "sqlite" in settings.DATABASE_URL else "postgresql",
            "status": "connected"
        },
        "audio_storage": {
            "mode": settings.AUDIO_STORAGE_MODE,
            "status": "configured" if settings.AUDIO_STORAGE_MODE == "local" or (settings.SUPABASE_URL and (settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_PUBLISHABLE_KEY)) else "missing_credentials",
            "credential_type": "service_role" if settings.SUPABASE_SERVICE_ROLE_KEY else ("publishable" if settings.SUPABASE_PUBLISHABLE_KEY else "none")
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
    """
    Transcribe farmer's audio and return the transcript in the ORIGINAL spoken
    language. The original audio is preserved in storage for operator reference.

    Language enforcement/translation is NOT applied here — that happens in the
    dedicated translation step so the operator always receives an English report
    while the farmer retains the original-language transcript.
    """
    # Validate file type
    content_type = file.content_type or ""
    if not (content_type.startswith("audio/") or file.filename.endswith((".wav", ".mp3", ".webm", ".ogg", ".m4a"))):
        raise HTTPException(status_code=400, detail="Invalid audio file format.")

    # Read bytes and persist through the configured storage adapter.
    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file exceeds 25MB limit.")

    os.makedirs(settings.AUDIO_STORAGE_PATH, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] or ".webm"
    storage_name = f"rec_{uuid.uuid4().hex[:12]}{ext}"
    try:
        await get_audio_storage().upload(audio_bytes, storage_name, content_type)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Audio storage is unavailable.") from exc

        # Transcribe via Bhashini ASR (supports Odia, Hindi, English and
    # language auto-detection where the configured service offers it).
    # No demo fallback in live mode — failures surface honestly.
    provider = get_speech_provider()
    language_hint = (language or "odia").lower()
    try:
        result = await provider.transcribe(audio_bytes, file.filename, language_hint=language_hint)
    except Exception as e:
        print(f"[transcribe] upstream speech provider error ({type(e).__name__}): {e}", flush=True)
        detail = str(e).strip() or type(e).__name__
        raise HTTPException(status_code=502, detail=f"Speech transcription failed: {detail[:400]}") from e

    transcript = result.get("transcript", "") or ""
    detected_lang = result.get("detected_language") or language_hint

    if not transcript.strip():
        raise HTTPException(
            status_code=502,
            detail="No speech was recognised in this recording. Please re-record, speaking clearly."
        )

    # Store the original-language transcript. Translation to English and to
    # the farmer's display language happens in dedicated downstream steps.
    result.pop("note", None)
    result["audio_object_key"] = storage_name
    result["original_transcript"] = transcript
    result["transcript"] = transcript  # original-language transcript
    result["transcript_language"] = detected_lang
    result["requested_app_language"] = language_hint
    result["language_enforcement"] = "original_language_preserved"
    return result


@router.post("/cases/translate-to-english")
async def translate_to_english(payload: dict):
    """
    Bhashini translation of the farmer's transcript (Odia/Hindi/English) into
    English for the Evon analysis step. The original transcript is preserved.
    """
    transcript = payload.get("transcript", "")
    source_language = (payload.get("source_language") or "odia").lower()
    if source_language not in ("odia", "hindi", "english"):
        source_language = "odia"

    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty.")

    client = get_bhashini_client()
    demo_passthrough = (
        not client.translation_configured and provider_mode() == "demo"
    )
    try:
        if demo_passthrough:
            english = transcript
        else:
            english = await client.translate_text(transcript, source_language, "english")
    except BhashiniError as exc:
        print(f"[translate-to-english] provider error ({type(exc).__name__}): {exc}", flush=True)
        raise HTTPException(status_code=502, detail=f"Translation failed: {str(exc)[:400]}") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Translation failed: {type(exc).__name__}") from exc

    return {
        "original_transcript": transcript,
        "source_language": source_language,
        "english_transcript": english,
        "translation_notes": "Demo adapter: transcript passed through untranslated." if demo_passthrough else "",
        "provider": "demo" if demo_passthrough else "bhashini",
        "is_demo": demo_passthrough,
    }


@router.post("/cases/extract-symptoms")
async def extract_symptoms_from_english(payload: dict):
    """
    Extract structured clinical symptoms from an ENGLISH transcript.
    This is the operator-facing extraction step — the transcript has already
    been translated to English, so extraction is consistent regardless of the
    farmer's spoken language.
    """
    transcript = payload.get("transcript", "")
    animal_type = payload.get("animal_type", "cow")
    language = payload.get("language", "english")
    input_mode = payload.get("input_mode", "voice")

    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty.")

    provider = get_reasoning_provider()
    try:
        result = await provider.extract_case(transcript, {
            "animal_type": animal_type,
            "language": language,
            "input_mode": input_mode
        })
        return result
    except Exception as e:
        print(f"[extract-symptoms] upstream reasoning provider error ({type(e).__name__}): {e}", flush=True)
        detail = str(e).strip() or type(e).__name__
        raise HTTPException(status_code=502, detail=f"Live symptom extraction failed: {detail[:400]}") from e


@router.post("/cases/confirm")
async def confirm_case(payload: dict):
    """
    Record the farmer's explicit confirmation or rejection of the understood
    report. If confirmed, the case is ready for submission. If rejected, the
    client may re-record or edit the transcript.
    """
    case_id = payload.get("case_id")
    confirmed = bool(payload.get("confirmed", False))

    if not case_id:
        raise HTTPException(status_code=400, detail="case_id is required.")

    return {
        "case_id": case_id,
        "confirmation_status": "confirmed" if confirmed else "rejected",
        "farmer_confirmed": confirmed,
    }


@router.post("/cases/append-recording")
async def append_recording(
    file: UploadFile = File(...),
    case_id: str = Form(...),
    animal_type: str = Form("cow"),
    language: str = Form("odia"),
    input_mode: str = Form("voice"),
):
    """
    Append a new recording to an existing case (Record More flow).
    Transcribes, translates to English, extracts symptoms, merges with
    existing case data, and regenerates localized summary + recommendations.
    """
    # Validate file type
    content_type = file.content_type or ""
    if not (content_type.startswith("audio/") or file.filename.endswith((".wav", ".mp3", ".webm", ".ogg", ".m4a"))):
        raise HTTPException(status_code=400, detail="Invalid audio file format.")

    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file exceeds 25MB limit.")

    # Transcribe new recording
    provider = get_speech_provider()
    language_hint = (language or "").lower()
    try:
        result = await provider.transcribe(audio_bytes, file.filename, language_hint=language_hint)
    except Exception as e:
        print(f"[append-recording] transcribe error ({type(e).__name__}): {e}", flush=True)
        detail = str(e).strip() or type(e).__name__
        raise HTTPException(status_code=502, detail=f"Live speech transcription failed: {detail[:400]}") from e

    new_transcript = result.get("transcript", "") or ""
    detected_lang = result.get("detected_language") or language_hint
    new_audio_key = result.get("audio_object_key", "")

    if not new_transcript.strip():
        raise HTTPException(
            status_code=502,
            detail="No speech was recognised in this recording. Please re-record, speaking clearly."
        )

    # Translate new transcript to English (Bhashini; demo passthrough in demo mode)
    client = get_bhashini_client()
    try:
        if not client.translation_configured and provider_mode() == "demo":
            english_transcript = new_transcript
        else:
            english_transcript = await client.translate_text(new_transcript, detected_lang, "english")
    except BhashiniError as exc:
        print(f"[append-recording] translation error: {exc}", flush=True)
        raise HTTPException(status_code=502, detail=f"Translation failed: {str(exc)[:400]}") from exc

    # Extract symptoms from English transcript
    reasoning_provider = get_reasoning_provider()
    try:
        extraction = await reasoning_provider.extract_case(english_transcript, {
            "animal_type": animal_type,
            "language": "english",
            "input_mode": input_mode
        })
    except Exception as e:
        print(f"[append-recording] extraction error ({type(e).__name__}): {e}", flush=True)
        detail = str(e).strip() or type(e).__name__
        raise HTTPException(status_code=502, detail=f"Live symptom extraction failed: {detail[:400]}") from e

    # Evaluate triage
    symptom_values = [
        s.get("value", "") for s in (extraction.get("symptoms_reported") or [])
        if s.get("value")
    ]
    triage_res = evaluate_triage(
        english_transcript,
        symptom_values,
        extraction.get("eating_or_drinking_change"),
        extraction.get("symptom_duration")
    )

    return {
        "case_id": case_id,
        "new_transcript": new_transcript,
        "new_audio_key": new_audio_key,
        "new_audio_url": f"/api/audio/{new_audio_key}" if new_audio_key else None,
        "english_transcript": english_transcript,
        "extraction": extraction,
        "urgency_level": triage_res.urgency_level,
        "urgency_reasons": triage_res.urgency_reasons,
        "immediate_actions": triage_res.immediate_actions,
        "detected_language": detected_lang,
    }


# ---------------------------------------------------------------------------
# Farmer-facing localized content (dynamic AI content)
#
# The v2 pipeline uses Bhashini translation for EVERY dynamic field (summary
# lines, precautions, recommendations, urgency explanations). Fixed medical-
# safety sentences stay deterministic (backend dictionaries) so translation
# can never weaken or alter them. The English AI analysis remains canonical:
# switching languages re-translates from English and never re-runs Evon/ASR.
# ---------------------------------------------------------------------------

SAFETY_FIXED = {
    # Fixed safety/urgency text per display language (NOT AI-translated)
    "odia": {
        "title": "ଆପଣ କ’ଣ କରିବେ?",
        "avoid": "ଯାହା କରନ୍ତୁ ନାହିଁ: ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ ବିନା କୌଣସି ଔଷଧ, ଇଞ୍ଜେକ୍ସନ କିମ୍ବା ଘରୋଇ ଉପଚାର ଦିଅନ୍ତୁ ନାହିଁ",
        "vet_required": "ହଁ, ପଶୁଚିକିତ୍ସକ ସହାୟତା ଆବଶ୍ୟକ",
        "vet_review": "ହଁ, ପଶୁଚିକିତ୍ସକ ସମୀକ୍ଷା ଆବଶ୍ୟକ",
        "vet_monitor": "ପରିଚାଳନା ପାଇଁ ମନିଟରିଂ ଆବଶ୍ୟକ",
        "urgent": "ତୁରନ୍ତ - ଆପଣଙ୍କ ପଶୁକୁ ତୁରନ୍ତ ପଶୁଚିକିତ୍ସା ଆବଶ୍ୟକ",
        "review": "ସାଧାରଣ - ପଶୁଚିକିତ୍ସକ ସହ ପରାମର୍ଶ କରନ୍ତୁ",
        "info": "ସୂଚନା - ଅଧିକ ବିବରଣୀ ଆବଶ୍ୟକ",
    },
    "hindi": {
        "title": "आपको क्या करना चाहिए?",
        "avoid": "क्या न करें: डॉक्टर की सलाह के बिना कोई दवा, इंजेक्शन या घरेलू उपचार न लें",
        "vet_required": "हां, पशु चिकित्सा सहायता आवश्यक है",
        "vet_review": "हां, पशु चिकित्सा समीक्षा आवश्यक है",
        "vet_monitor": "प्रबंधन के लिए निगरानी आवश्यक",
        "urgent": "तत्काल - आपके पशु को तुरंत पशु चिकित्सा ध्यान देने की आवश्यकता है",
        "review": "सामान्य - पशु चिकित्सक से परामर्श करें",
        "info": "सूचना - अधिक जानकारी आवश्यक",
    },
    "english": {
        "title": "What should you do?",
        "avoid": "What to Avoid: Do not give any medicines, injections, or home remedies without a vet's advice",
        "vet_required": "Yes, veterinary assistance is needed",
        "vet_review": "Yes, veterinary consultation is needed",
        "vet_monitor": "Monitoring needed for management",
        "urgent": "URGENT - Your animal needs immediate veterinary attention",
        "review": "ROUTINE - Consult a veterinarian",
        "info": "INFO NEEDED - More information required",
    },
}


def _join(items) -> str:
    return ", ".join(i for i in items if i)


def _compose_english_content(english_report: dict, triage_result: dict) -> dict:
    """
    Canonical English farmer-facing content.

    The summary is a natural-language paragraph built ONLY from what the
    farmer actually reported (Evon's factual case_summary). Structured
    clinical details live in separate lists and are clearly AI-extractions.
    Never calls Evon; language switches are cheap.
    """
    e = english_report or {}
    t = triage_result or {}

    # Natural summary paragraph: ONLY farmer statements, no field labels,
    # no AI-inferred extras. Preferred source is Evon's factual case_summary
    # ("what the farmer reported"); fallback is the English translation of
    # the farmer's own words (farmer_statement), which is likewise only what
    # the farmer said.
    summary_text = str(e.get("case_summary") or "").strip()
    if not summary_text:
        summary_text = str(e.get("farmer_statement") or "").strip()
    # Trim meta prefixes some models echo
    summary_text = re.sub(
        r"^what the farmer reports? (that )?[:,-]?\s*",
        "", summary_text, flags=re.IGNORECASE)
    summary_text = re.sub(
        r"^(farmer reports?|the farmer reports?) (that )?",
        "", summary_text, flags=re.IGNORECASE)
    summary_text = summary_text.strip()

    symptoms = [
        s.get("value", "") for s in (e.get("symptoms_reported") or [])
        if isinstance(s, dict) and s.get("value")
    ]
    precautions = [i for i in (e.get("immediate_precautions") or []) if str(i).strip()]
    recommendations = [i for i in (e.get("recommendations") or []) if str(i).strip()]
    if not recommendations:
        recommendations = [i for i in (t.get("immediate_actions") or []) if str(i).strip()]
    urgency_reasons = [i for i in (t.get("urgency_reasons") or e.get("urgency_reasons") or []) if str(i).strip()]
    causes = [i for i in (e.get("possible_causes") or []) if str(i).strip()]
    questions = [i for i in (e.get("follow_up_questions") or []) if str(i).strip()]

    urgency_raw = str(t.get("urgency_level") or e.get("urgency_level") or "review").lower()
    triage_code = {
        "emergency": "urgent",
        "urgent": "urgent",
        "routine": "review",
        "review": "review",
        "info_needed": "info_needed",
    }.get(urgency_raw, "review")

    return {
        "summary_text": summary_text,
        "symptoms": symptoms,
        "precautions": precautions,
        "recommendations": recommendations,
        "urgency_reasons": urgency_reasons,
        "possible_causes": causes,
        "follow_up_questions": questions,
        "triage_code": triage_code,
    }


_localized_content_cache: dict = {}
_LOCALIZED_CACHE_MAX = 300


def _cache_key(english: dict, target: str) -> str:
    blob = repr(_compose_english_content(english, {})) + "|" + target
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


@router.post("/cases/generate-localized-content")
async def generate_localized_content(payload: dict):
    """
    Translate the farmer-facing dynamic content (canonical English) into the
    selected display language using Bhashini. Fixed medical-safety sentences
    come from the backend dictionary so they can never be altered by NMT.
    The English analysis is never recomputed (no Evon call here).
    """
    english_report = payload.get("english_report") or {}
    triage_result = payload.get("triage_result") or {}
    target = (payload.get("target_language") or "english").lower()
    if target not in ("odia", "hindi", "english"):
        target = "english"

    composed = _compose_english_content(english_report, triage_result)
    triage_code = composed["triage_code"]
    t = SAFETY_FIXED.get(target, SAFETY_FIXED["english"])

    vet_map = {"urgent": t["vet_required"], "review": t["vet_review"], "info_needed": t["vet_monitor"]}
    urgency_map = {"urgent": t["urgent"], "review": t["review"], "info_needed": t["info"]}

    # Every dynamic string is translated individually so the frontend can
    # render each item as its own element (numbered steps, badge chips...).
    dynamic = (
        ([composed["summary_text"]] if composed["summary_text"] else [])
        + composed["symptoms"]
        + composed["precautions"]
        + composed["recommendations"]
        + composed["urgency_reasons"]
        + composed["possible_causes"]
        + composed["follow_up_questions"]
    )
    dynamic = [d for d in dynamic if d and str(d).strip()]

    if target == "english":
        translated = list(dynamic)
        demo_passthrough = False
    else:
        client = get_bhashini_client()
        demo_passthrough = (
            not client.translation_configured and provider_mode() == "demo"
        )
        if demo_passthrough:
            # Demo adapter (no Bhashini configured): pass content through
            # untranslated and flag it — nothing pretends to be translated.
            translated = list(dynamic)
        elif client.translation_configured:
            key = _cache_key(english_report, target)
            cached = _localized_content_cache.get(key)
            if cached is not None:
                hit = dict(cached)
                hit["cached"] = True
                return hit
            try:
                translated = await client.translate_texts(dynamic, "english", target)
            except BhashiniError as exc:
                print(f"[generate-localized-content] bhashini error: {exc}", flush=True)
                raise HTTPException(status_code=502, detail=f"Translation failed: {str(exc)[:400]}") from exc
            except Exception as exc:
                raise HTTPException(status_code=502, detail=f"Translation failed: {type(exc).__name__}") from exc
        else:
            raise HTTPException(status_code=503, detail="Translation service is not configured.")

    idx = 0
    def take(n):
        nonlocal idx
        part = translated[idx:idx + n]
        idx += n
        return part

    n_summary = 1 if composed["summary_text"] else 0
    summary_t = take(n_summary)
    symptoms_t = take(len(composed["symptoms"]))
    precautions_t = take(len(composed["precautions"]))
    recommendations_t = take(len(composed["recommendations"]))
    reasons_t = take(len(composed["urgency_reasons"]))
    causes_t = take(len(composed["possible_causes"]))
    questions_t = take(len(composed["follow_up_questions"]))

    localized_summary = summary_t[0] if summary_t else ""

    # Every item is its own step (rendered as a numbered list by the UI)
    steps_t = recommendations_t
    if not steps_t and triage_code == "urgent":
        steps_t = [vet_map[triage_code]]

    response = {
        "localized_summary": localized_summary,
        "localized_symptoms": symptoms_t,
        "localized_precautions": precautions_t,
        "localized_recommendations": steps_t,
        "localized_urgency_reasons": reasons_t,
        "localized_possible_causes": causes_t,
        "localized_followup_questions": questions_t,
        # Fixed medical-safety sentences (never AI-translated)
        "fixed": {
            "what_to_do": t["title"],
            "avoid": t["avoid"],
            "vet_line": vet_map[triage_code],
            "urgency_line": urgency_map[triage_code],
        },
        "urgency_level": triage_code,
        "target_language": target,
        "provider": "demo" if demo_passthrough else "bhashini",
        "is_demo": demo_passthrough,
        "cached": False,
    }
    key = _cache_key(english_report, target)
    _localized_content_cache[key] = response
    if len(_localized_content_cache) > _LOCALIZED_CACHE_MAX:
        _localized_content_cache.clear()
    return response


@router.post("/tts/generate", response_model=TTSGenerateResponse)
async def generate_tts(payload: TTSGenerateRequest):
    """
    Generate selected-language speech via Bhashini TTS (Odia, Hindi,
    English). No transliteration hacks are needed anymore: Bhashini handles
    native scripts.
    """
    text = (payload.text or "").strip()
    language = (payload.language or "odia").lower()
    if language not in ("odia", "hindi", "english"):
        language = "odia"
    if not text:
        raise HTTPException(status_code=400, detail="Text is required for TTS generation.")

    provider = get_voice_provider()
    try:
        audio_bytes = await provider.synthesize(text, language=language)
    except BhashiniError as exc:
        print(f"[tts] bhashini error: {exc}", flush=True)
        raise HTTPException(status_code=502, detail=f"TTS generation failed: {str(exc)[:400]}") from exc
    except Exception as exc:
        detail = str(exc).strip() or type(exc).__name__
        raise HTTPException(status_code=502, detail=f"TTS generation failed: {detail[:400]}") from exc

    os.makedirs(settings.AUDIO_STORAGE_PATH, exist_ok=True)
    storage_name = f"tts_{uuid.uuid4().hex[:12]}.wav"
    try:
        await get_audio_storage().upload(audio_bytes, storage_name, "audio/wav")
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Audio storage unavailable.") from exc

    return {
        "audio_object_key": storage_name,
        "audio_url": f"/api/audio/{storage_name}",
        "text": text,
        "language": language,
    }


@router.post("/cases/enforce-language")
async def enforce_transcript_language(payload: dict):
    """
    Verifies/forces a TRANSCRIPT (not audio) into a selected language. Used by
    the 'Type Text' input mode, which bypasses audio transcription, and by the
    processing step when the farmer switches the app language after recording.
    Same rule and statuses as /audio/transcribe's enforcement step.
    """
    transcript = payload.get("transcript", "")
    language = (payload.get("language") or "").lower()

    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty.")

    enforcement = await ensure_selected_language(transcript, language)
    if (
        enforcement["language_enforcement"] == "unverified"
        and provider_mode() == "demo"
    ):
        # Demo adapter: no Bhashini translation available, accept as-is and
        # flag clearly so nothing pretends to be a real translation.
        enforcement["language_enforcement"] = "verified_match"
        enforcement["is_demo"] = True
    if enforcement["language_enforcement"] not in ("verified_match", "translated"):
        shown_lang = enforcement.get("transcript_language") or "unknown"
        raise HTTPException(
            status_code=502,
            detail=(
                f"Transcript language mismatch: the text appears to be in "
                f"'{shown_lang}' but the selected app language is '{language}', "
                f"and automatic translation could not be verified. Please "
                f"re-record or retype."
            )
        )
    return enforcement

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
        print(f"[extract] upstream reasoning provider error ({type(e).__name__}): {e}", flush=True)
        if settings.AI_PROVIDER_MODE == "live":
            detail = str(e).strip() or type(e).__name__
            raise HTTPException(status_code=502, detail=f"Live symptom extraction failed: {detail[:400]}") from e
        from app.services.demo_providers import DemoReasoningProvider
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
    # Generate unique public reference code like JS-2026-XXXXXXXX
    rand_code = uuid.uuid4().hex[:8].upper()
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
        is_demo_record=case_in.is_demo_record or (settings.AI_PROVIDER_MODE == "demo"),
        # Multilingual voice workflow fields
        original_audio_keys=case_in.original_audio_keys,
        original_transcripts=case_in.original_transcripts,
        english_operator_transcript=case_in.english_operator_transcript,
        tts_audio_object_key=case_in.tts_audio_object_key,
        farmer_confirmed=bool(case_in.farmer_confirmed),
        confirmation_status=case_in.confirmation_status or "pending",
        record_more_count=case_in.record_more_count or 0,
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
    try:
        content, content_type = await get_audio_storage().download(filename)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Audio file not found.") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Audio storage is unavailable.") from exc
    return Response(content=content, media_type=content_type)
