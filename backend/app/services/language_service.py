"""
Language services for JeevSetu: language names, script heuristics and the
"ensure selected language" step used by the typed-text flow and by language
switching after recording.

Migration note: the previous LLM-backed enforcer (NVIDIA/Groq) is replaced by
script heuristics + Bhashini translation. Detection of the actual language is
script-based (zero-cost, offline); correction is a plain Bhashini NMT call.
"""

import re

from app.services.bhashini_service import (
    BhashiniError,
    get_bhashini_client,
)

async def _script_detect(text: str) -> str:
    return await get_bhashini_client().detect_language(text)

# Canonical app language -> full name (used for prompts and status reports)
LANGUAGE_NAMES = {
    "odia": "Odia (Odia script)",
    "hindi": "Hindi (Devanagari)",
    "english": "English",
}


def script_profile(text: str) -> dict:
    odia = deva = latin = 0
    for ch in text:
        if "\u0B00" <= ch <= "\u0B7F":
            odia += 1
        elif "\u0900" <= ch <= "\u097F":
            deva += 1
        elif ch.isascii() and ch.isalpha():
            latin += 1
    return {"odia": odia, "devanagari": deva, "latin": latin}


def script_dominates(text: str, family: str) -> bool:
    profile = script_profile(text)
    family_script = {"odia": "odia", "hindi": "devanagari", "english": "latin"}.get(family)
    if not family_script:
        return False
    return profile[family_script] > 0 and profile[family_script] == max(profile.values())


def heuristic_matches_requested(text: str, requested: str) -> bool | None:
    """Cheap script check. None = inconclusive (too little data)."""
    if not text or not text.strip():
        return None
    profile = script_profile(text)
    totalnative = profile["odia"] + profile["devanagari"]
    if totalnative < 3 and profile["latin"] < 3:
        return None
    # A mixed-script text (e.g. transcribed Odia in Latin) is inconclusive here
    if profile["latin"] > 0 and totalnative > 0:
        if script_dominates(text, requested):
            return True
        minor_native = totalnative
        if minor_native >= 3 and script_dominates(text, "odia" if "odia" in profile else requested) is not None:
            return script_dominates(text, requested)
        return None
    return script_dominates(text, requested)


def needs_verification(requested: str) -> bool:
    return requested in ("odia", "hindi")


def normalize_source_language(name: str | None) -> str | None:
    if not name:
        return None
    n = str(name).strip().lower()
    aliases = {
        "odia": "odia", "oriya": "odia", "or": "odia", "od": "odia",
        "hindi": "hindi", "hi": "hindi",
        "english": "english", "en": "english",
    }
    for key, value in aliases.items():
        if key in n:
            return value
    return None


__EXPECTED_SCRIPT__ = {"odia": "odia", "hindi": "devanagari", "english": "latin"}


async def ensure_selected_language(transcript: str, requested: str, detected: str | None = None) -> dict:
    """
    Public entry point used by POST /api/cases/enforce-language.

    Heuristically verifies the transcript is in the requested language; when
    it is a different supported language, translates via Bhashini into the
    requested language (numbers, units and clinical wording preserved by NMT).

    Returns a dict:
      {
        "transcript": str  — text in the selected language, or the ORIGINAL text
                             when the mismatch is unsupported (callers must
                             check language_enforcement).
        "requested_language": requested,
        "transcript_language": str|null
        "language_translated": bool,
        "original_transcript": str,
        "language_enforcement": one of
             "verified_match"     — content already in the selected language
             "translated"         — translated via Bhashini
             "unverified"         — Bhashini not configured / unknown language
             "enforcement_failed" — Bhashini failed (retry later)
      }
    Never raises — callers decide the UX.
    """
    requested = (requested or "").lower()
    result = {
        "transcript": transcript,
        "requested_language": requested,
        "transcript_language": None,
        "language_translated": False,
        "original_transcript": transcript,
        "provider": "bhashini",
        "is_demo": False,
    }
    if not transcript or not transcript.strip():
        result["language_enforcement"] = "no_transcript"
        return result

    detected = detected or await _script_detect(transcript)
    result["transcript_language"] = detected

    # English is always accepted regardless of display language preference.
    if requested not in __EXPECTED_SCRIPT__ or requested == "english":
        result["language_enforcement"] = "verified_match"
        return result

    if detected == requested:
        result["language_enforcement"] = "verified_match"
        return result

    if detected not in ("odia", "hindi", "english"):
        result["language_enforcement"] = "unverified"
        return result

    client = get_bhashini_client()
    if not client.translation_configured:
        result["language_enforcement"] = "unverified"
        return result

    try:
        translated = await client.translate_text(transcript, detected, requested)
        result["transcript"] = translated
        result["language_translated"] = True
        result["transcript_language"] = requested
        result["language_enforcement"] = "translated"
        return result
    except BhashiniError as exc:
        print(f"[language_service] Bhashini translation failed: {exc}", flush=True)
        result["language_enforcement"] = "enforcement_failed"
        return result
