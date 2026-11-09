import os
import uuid
import random
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
from app.services.gnani.factory import get_speech_provider, get_reasoning_provider, get_voice_provider
from app.services.language_service import ensure_selected_language
from app.services.storage import get_audio_storage
from app.services.translation import get_translation_provider

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
    has_api_key = bool(settings.GNANI_API_KEY)
    return {
        "provider_mode": settings.AI_PROVIDER_MODE,
        "gnani": {
            "api_key_configured": has_api_key,
            "base_url": settings.GNANI_API_BASE_URL,
            "prisma_model": settings.GNANI_PRISMA_MODEL,
            "prisma_status": "live" if (has_api_key and settings.AI_PROVIDER_MODE == "live") else "demo_mode",
            "timbre_model": settings.GNANI_TIMBRE_MODEL,
            "timbre_status": "live" if (has_api_key and settings.AI_PROVIDER_MODE == "live") else "demo_mode"
        },
        "reasoning": {
            "provider": "nvidia_nim",
            "model": settings.DEEPSEEK_MODEL,
            "base_url": settings.DEEPSEEK_BASE_URL,
            "status": "live" if settings.DEEPSEEK_API_KEY else "not_configured"
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

    # Transcribe via speech provider (live only — no demo fallback)
    provider = get_speech_provider()
    language_hint = (language or "").lower()
    try:
        result = await provider.transcribe(audio_bytes, file.filename, language_hint=language_hint)
    except Exception as e:
        print(f"[transcribe] upstream speech provider error ({type(e).__name__}): {e}", flush=True)
        detail = str(e).strip() or type(e).__name__
        raise HTTPException(status_code=502, detail=f"Live speech transcription failed: {detail[:400]}") from e

    transcript = result.get("transcript", "") or ""
    detected_lang = result.get("detected_language") or language_hint

    if not transcript.strip():
        raise HTTPException(
            status_code=502,
            detail="No speech was recognised in this recording. Please re-record, speaking clearly."
        )

    # Honest STT support notice: Gnani Prisma does not natively support Odia.
    stt_support_note = None
    if language_hint == "odia":
        stt_support_note = (
            "Gnani Prisma does not support Odia natively (indic-auto fallback only). "
            "Recognition quality for Odia may be lower than for Hindi/English. "
            "The detected language is reported below — verify it matches what you spoke."
        )

    # Store the original-language transcript. Translation to English and to the
    # farmer's selected language happens in dedicated downstream steps.
    result["audio_object_key"] = storage_name
    result["original_transcript"] = transcript
    result["transcript"] = transcript  # original-language transcript for now
    result["transcript_language"] = detected_lang
    result["requested_app_language"] = language_hint
    result["language_enforcement"] = "original_language_preserved"
    result["stt_support_note"] = stt_support_note
    return result


@router.post("/cases/translate-to-english")
async def translate_to_english(payload: dict):
    """
    Translate a farmer's transcript (in Odia, Hindi, English, or code-mixed)
    into English for the veterinary operator. The original transcript is
    preserved and returned alongside the English translation.
    """
    transcript = payload.get("transcript", "")
    source_language = payload.get("source_language", "odia")

    if not transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is empty.")

    translator = get_translation_provider()

    try:
        result = await translator.translate_to_english(transcript, source_language)
    except Exception as exc:
        print(f"[translate-to-english] provider error ({type(exc).__name__}): {exc}", flush=True)
        detail = str(exc).strip() or type(exc).__name__
        raise HTTPException(status_code=502, detail=f"Translation failed: {detail[:400]}") from exc

    return {
        "original_transcript": transcript,
        "source_language": result.get("source_language", source_language),
        "english_transcript": result.get("translated_text", transcript),
        "translation_notes": result.get("notes", ""),
        "provider": "nvidia_nim_translation",
        "is_demo": False,
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

    # Translate new transcript to English
    translator = get_translation_provider()
    try:
        translation = await translator.translate_to_english(new_transcript, detected_lang)
    except Exception as exc:
        print(f"[append-recording] translation error ({type(exc).__name__}): {exc}", flush=True)
        detail = str(exc).strip() or type(exc).__name__
        raise HTTPException(status_code=502, detail=f"Translation failed: {detail[:400]}") from exc

    english_transcript = translation.get("translated_text", new_transcript)

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


# Deterministic templates for farmer-facing content in Odia, Hindi, English
# No LLM translation needed — works 100% reliably

LOCALIZED_TEMPLATES = {
    "odia": {
        "summary": {
            "animal_type": "ପଶୁ ପ୍ରକାର: {animal_type}",
            "symptoms": "ଲକ୍ଷଣ: {symptoms}",
            "duration": "ଅବଧି: {duration}",
            "feed_water": "ଖାଦ୍ୟ ଓ ପାଣି: {feed_water}",
            "milk": "କ୍ଷୀର ଉତ୍ପାଦନ: {milk}",
            "other": "ଅନ୍ୟ ବିବରଣୀ: {other}",
            "no_symptoms": "କୌଣସି ନିର୍ଦ୍ଦିଷ୍ଟ ଲକ୍ଷଣ ରେକର୍ଡ କରାଯାଇ ନାହିଁ",
            "not_provided": "ପ୍ରଦାନ କରାଯାଇ ନାହିଁ",
        },
        "recommendations": {
            "title": "ଆପଣ କ’ଣ କରିବେ?",
            "immediate": "ତୁରନ୍ତ ପଦକ୍ଷେପ: {actions}",
            "monitor": "ଯାହା ଦେଖିବାକୁ ହେବ: {monitor}",
            "avoid": "ଯାହା କରନ୍ତୁ ନାହିଁ: ଡାକ୍ତରଙ୍କ ପରାମର୍ଶ ବିନା କୌଣସି ଔଷଧ, ଇଞ୍ଜେକ୍ସନ କିମ୍ବା ଘରୋଇ ଉପଚାର ଦିଅନ୍ତୁ ନାହିଁ",
            "vet": "ପଶୁଚିକିତ୍ସା ସହାୟତା: {vet_needed}",
            "urgency": "ଗୁରୁତ୍ୱ: {urgency}",
            "vet_required": "ହଁ, ପଶୁଚିକିତ୍ସକ ସହାୟତା ଆବଶ୍ୟକ",
            "vet_review": "ହଁ, ପଶୁଚିକିତ୍ସକ ସମୀକ୍ଷା ଆବଶ୍ୟକ",
            "vet_monitor": "ପରିଚାଳନା ପାଇଁ ମନିଟରିଂ ଆବଶ୍ୟକ",
            "urgent": "ତୁରନ୍ତ - ଆପଣଙ୍କ ପଶୁକୁ ତୁରନ୍ତ ପଶୁଚିକିତ୍ସା ଆବଶ୍ୟକ",
            "review": "ସାଧାରଣ - ପଶୁଚିକିତ୍ସକ ସହ ପରାମର୍ଶ କରନ୍ତୁ",
            "info": "ସୂଚନା - ଅଧିକ ବିବରଣୀ ଆବଶ୍ୟକ",
        },
    },
    "hindi": {
        "summary": {
            "animal_type": "पशु प्रकार: {animal_type}",
            "symptoms": "लक्षण: {symptoms}",
            "duration": "अवधि: {duration}",
            "feed_water": "खाना-पानी: {feed_water}",
            "milk": "दूध उत्पादन: {milk}",
            "other": "अन्य विवरण: {other}",
            "no_symptoms": "कोई विशिष्ट लक्षण दर्ज नहीं किया गया",
            "not_provided": "प्रदान नहीं किया गया",
        },
        "recommendations": {
            "title": "आपको क्या करना चाहिए?",
            "immediate": "तुरंत कार्रवाई: {actions}",
            "monitor": "क्या देखें: {monitor}",
            "avoid": "क्या न करें: डॉक्टर की सलाह के बिना कोई दवा, इंजेक्शन या घरेलू उपचार न लें",
            "vet": "पशु चिकित्सा सहायता: {vet_needed}",
            "urgency": "गंभीरता: {urgency}",
            "vet_required": "हां, पशु चिकित्सा सहायता आवश्यक है",
            "vet_review": "हां, पशु चिकित्सा समीक्षा आवश्यक है",
            "vet_monitor": "प्रबंधन के लिए निगरानी आवश्यक",
            "urgent": "तत्काल - आपके पशु को तुरंत पशु चिकित्सा ध्यान देने की आवश्यकता है",
            "review": "सामान्य - पशु चिकित्सक से परामर्श करें",
            "info": "सूचना - अधिक जानकारी आवश्यक",
        },
    },
    "english": {
        "summary": {
            "animal_type": "Animal: {animal_type}",
            "symptoms": "Symptoms: {symptoms}",
            "duration": "Duration: {duration}",
            "feed_water": "Feed & Water: {feed_water}",
            "milk": "Milk Production: {milk}",
            "other": "Other Details: {other}",
            "no_symptoms": "No specific symptoms reported",
            "not_provided": "Not provided",
        },
        "recommendations": {
            "title": "What should you do?",
            "immediate": "Immediate Actions: {actions}",
            "monitor": "What to Monitor: {monitor}",
            "avoid": "What to Avoid: Do not give any medicines, injections, or home remedies without a vet's advice",
            "vet": "Veterinary Assistance: {vet_needed}",
            "urgency": "Urgency: {urgency}",
            "vet_required": "Yes, veterinary assistance is needed",
            "vet_review": "Yes, veterinary consultation is needed",
            "vet_monitor": "Monitoring needed for management",
            "urgent": "URGENT - Your animal needs immediate veterinary attention",
            "review": "ROUTINE - Consult a veterinarian",
            "info": "INFO NEEDED - More information required",
            "not_provided": "Not provided",
        },
    },
}


def _format_summary(english_report: dict, lang: str) -> str:
    """Build a formatted summary in the target language using templates.
    Only shows fields that have actual data — skips 'Not provided' fields.
    """
    t = LOCALIZED_TEMPLATES.get(lang, LOCALIZED_TEMPLATES["english"])["summary"]
    symptoms = english_report.get("symptoms_reported", [])
    symptom_list = ", ".join(s.get("value", "") for s in symptoms if s.get("value"))

    parts = []
    animal_type = english_report.get("animal_type")
    if animal_type:
        parts.append(t["animal_type"].format(animal_type=animal_type))
    if symptom_list:
        parts.append(t["symptoms"].format(symptoms=symptom_list))
    duration = english_report.get("symptom_duration")
    if duration and duration != "Not provided":
        parts.append(t["duration"].format(duration=duration))
    feed_water = english_report.get("eating_or_drinking_change")
    if feed_water and feed_water != "Not provided":
        parts.append(t["feed_water"].format(feed_water=feed_water))
    milk = english_report.get("milk_production_change")
    if milk and milk != "Not provided":
        parts.append(t["milk"].format(milk=milk))
    if english_report.get("other_observations"):
        parts.append(t["other"].format(other=", ".join(english_report["other_observations"])))

    if not parts:
        parts.append(t["no_symptoms"])

    return "\n".join(parts)


def _format_recommendations(english_report: dict, triage_result: dict, lang: str) -> str:
    """Build formatted recommendations in the target language using templates.
    Uses bullet points (•) instead of paragraph style.
    """
    t = LOCALIZED_TEMPLATES.get(lang, LOCALIZED_TEMPLATES["english"])["recommendations"]

    urgency = triage_result.get("urgency_level", "review")
    urgency_map = {
        "urgent": t["urgent"],
        "review": t["review"],
        "info_needed": t["info"],
    }
    vet_map = {
        "urgent": t["vet_required"],
        "review": t["vet_review"],
        "info_needed": t["vet_monitor"],
    }

    immediate_actions = triage_result.get("immediate_actions", [])
    actions_text = "; ".join(immediate_actions) if immediate_actions else t["not_provided"]

    monitor_text = "Observe the animal for changes in breathing, appetite, and behavior. Contact a vet if symptoms worsen."

    lines = [
        f"• {t['title']}",
        f"• {t['immediate']}".format(actions=actions_text),
        f"• {t['monitor']}".format(monitor=monitor_text),
        f"• {t['avoid']}",
        f"• {t['vet']}".format(vet_needed=vet_map.get(urgency, t["vet_review"])),
        f"• {t['urgency']}".format(urgency=urgency_map.get(urgency, t["review"])),
    ]

    return "\n".join(lines)


@router.post("/cases/generate-localized-content")
async def generate_localized_content(payload: dict):
    """
    Generate localized summary and recommendations for the farmer
    from the English operator report and triage result.
    Uses deterministic templates — no LLM translation needed, works 100% reliably.
    """
    english_report = payload.get("english_report", {})
    triage_result = payload.get("triage_result", {})
    target_language = payload.get("target_language", "odia")

    if not english_report:
        raise HTTPException(status_code=400, detail="English report is required.")

    localized_summary = _format_summary(english_report, target_language)
    localized_recommendations = _format_recommendations(english_report, triage_result, target_language)

    return {
        "target_language": target_language,
        "localized_summary": localized_summary,
        "summary_notes": "Generated using deterministic templates",
        "localized_recommendations": localized_recommendations,
        "recommendations_notes": "Generated using deterministic templates",
    }


from unidecode import unidecode


def transliterate_to_roman(text: str, language: str) -> str:
    """Transliterate Devanagari/Odia text to Roman script for TTS fallback."""
    if language not in ("hindi", "odia"):
        return text
    # unidecode converts Unicode text to best-effort ASCII representation
    roman = unidecode(text)
    # Strip punctuation that Gnani Timbre may not handle well
    roman = "".join(ch for ch in roman if ch.isalnum() or ch.isspace())
    return roman.strip()


@router.post("/tts/generate", response_model=TTSGenerateResponse)
async def generate_tts(payload: TTSGenerateRequest):
    """
    Generate selected-language TTS audio for voice confirmation.
    Uses Gnani Timbre (live only). For Hindi/Odia, if Gnani Timbre cannot
    synthesize non-Latin script text, falls back to Roman-script
    transliteration with English language code so the farmer still hears
    the confirmation in their language.
    """
    text = (payload.text or "").strip()
    language = (payload.language or "odia").lower()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required for TTS generation.")

    provider = get_voice_provider()
    tried_fallback = False
    roman_text = text
    try:
        audio_bytes = await provider.synthesize(text, language=language)
    except Exception as exc:
        # If the provider cannot synthesize non-Latin script (e.g. Gnani Timbre
        # returns 500 "No audio generated during synthesis"), fall back to
        # Roman-script transliteration with English language code.
        if language in ("hindi", "odia") and ("500" in str(exc) or "No audio generated" in str(exc)):
            tried_fallback = True
            roman_text = transliterate_to_roman(text, language)
            if not roman_text.strip():
                raise HTTPException(
                    status_code=502,
                    detail=f"TTS transliteration produced empty text for language={language}"
                )
            try:
                audio_bytes = await provider.synthesize(roman_text, language="english")
            except Exception as exc2:
                detail = str(exc2).strip() or type(exc2).__name__
                raise HTTPException(
                    status_code=502,
                    detail=f"TTS generation failed (original: {str(exc).strip()[:200]}; fallback: {detail[:200]})"
                ) from exc2
        else:
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
        "text": text if not tried_fallback else roman_text,
        "language": "english" if tried_fallback else language,
        "transliterated": tried_fallback,
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
