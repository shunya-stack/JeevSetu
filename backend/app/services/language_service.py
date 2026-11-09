"""
Language enforcement for JeevSetu speech transcription.

Why this module exists (verified against the live Gnani Vachana API on 2026-11-08):
- The Prisma STT endpoint (/stt/v3) treats `language_code` as a HINT, not a lock.
  With language_code=en-IN over Hindi speech it returns ROMANISED Hindi
  ("Meri gaaye do dinon se ...") tagged detected_language_code=en-IN, because the
  tag is judged from the (Latin) script of the transcript, not the language.
- Odia (or-IN) is not supported at all: the API rejects it with
  INVALID_LANGUAGE_CODE, and `indic-auto` detection does not cover Odia either.
  Odia is JeevSetu's default app language, so recognition for Odia relies on
  Prisma returning something else entirely (another Indian language or
  romanised text) and the enforcement layer below translating it — or failing
  loudly so the farmer can re-record.
- Field reports: Bengali speech can be returned written in Bengali script
  while a different language is selected. Bengali, Odia, Hindi and Devanagari
  are therefore NOT treated as interchangeable anywhere below.

Enforcement rule: the transcript displayed to the farmer must be in the
SELECTED app language (by actual language, not script alone). If the provider
returned another language we translate with the configured reasoning LLM
(DeepSeek), preserving the original meaning and medical terminology, verify the
result script, and on any failure we report it explicitly instead of silently
displaying a wrong-language transcript. The original transcript is always
preserved for traceability.
"""

import json
import re

from app.core.config import settings
from app.services.llm.nvidia_nim_adapter import NVIDIANIMAdapter
from app.services.llm.groq_adapter import GroqAdapter

# App-level language names sent to the LLM.
LANGUAGE_NAMES = {
    "odia": "Odia (ଓଡ଼ିଆ)",
    "hindi": "Hindi (हिन्दी)",
    "english": "English",
}

# Unicode script families used for cheap first-pass checks.
# NOTE: Bengali (\u0980-\u09FF) is intentionally separate from Devanagari
# (\u0900-\u097F) and from Odia (\u0B00-\u0B7F). They are different languages
# and must never be treated as the same language family.
DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
ODIA_RE = re.compile(r"[\u0B00-\u0B7F]")
BENGALI_RE = re.compile(r"[\u0980-\u09FF]")  # Bengali / Bangla (and Assamese) script
LATIN_RE = re.compile(r"[A-Za-z]")


def script_profile(text: str) -> str:
    """Dominant script family: 'odia' | 'devanagari' | 'bengali' | 'latin' | 'other'."""
    if not text:
        return "other"
    odia = len(ODIA_RE.findall(text))
    deva = len(DEVANAGARI_RE.findall(text))
    beng = len(BENGALI_RE.findall(text))
    latin = len(LATIN_RE.findall(text))
    counts = {"odia": odia, "devanagari": deva, "bengali": beng, "latin": latin}
    best = max(counts, key=lambda k: counts[k])
    return best if counts[best] > 0 else "other"


def script_dominates(text: str, family: str) -> bool:
    """True when the expected script family is present and dominant in the text."""
    if not text:
        return False
    odia = len(ODIA_RE.findall(text))
    deva = len(DEVANAGARI_RE.findall(text))
    beng = len(BENGALI_RE.findall(text))
    latin = len(LATIN_RE.findall(text))
    counts = {"odia": odia, "devanagari": deva, "bengali": beng, "latin": latin}
    if counts.get(family, 0) == 0:
        return False
    # A few code-mixed words in another script are allowed, but the expected
    # script must be the dominant one.
    return counts[family] > max(v for k, v in counts.items() if k != family)


def heuristic_matches_requested(text: str, requested: str) -> bool | None:
    """
    Cheap script-based check. Returns:
      True  -> transcript script definitely matches the requested language
      False -> transcript script definitely does NOT match
      None  -> cannot decide from script alone (LLM verification required)
    Script identity only: script Profile never implies the SAME language —
    (Bengali != Devanagari/Hindi != Odia; romanised Indic is detected by the
    LLM, not by scripts).
    """
    script = script_profile(text)
    expected = {
        "odia": "odia",
        "hindi": "devanagari",
        "english": "latin",
    }.get(requested)
    if expected is None:
        return None
    if script == expected:
        return True
    if script in ("odia", "devanagari", "bengali", "other"):
        # A different Indic script can never be the requested language.
        return False
    return None  # latin vs everything else: needs an actual-language check


def needs_verification(requested: str) -> bool:
    """Whether LLM language verification applies for the requested app language."""
    return requested in ("odia", "hindi", "english")


def normalize_source_language(name: str | None) -> str | None:
    """LLM-reported language names -> canonical tokens for the app languages."""
    if not name:
        return None
    s = str(name).strip().lower()
    # strip BCP-like suffixes and qualifiers
    if "english" in s or s.startswith("en"):
        return "english"
    if "hindi" in s or s.startswith("hi"):
        return "hindi"
    if "odia" in s or "oriya" in s or s.startswith("or"):
        return "odia"
    if "assamese" in s or s.startswith("as"):
        return "assamese"
    if "bengal" in s or "bangla" in s or s.startswith("bn"):
        return "bengali"
    for lang in ("marathi", "gujarati", "punjabi", "tamil", "telugu", "kannada", "malayalam"):
        if lang in s:
            return lang
    return s.split()[0] if s else None


class LanguageEnforcer:
    """
    Verifies the transcript language and, when it differs from the selected
    language, translates it to the selected language.
    Tries NVIDIA NIM first, then Groq (free fallback).

    One structured call per transcript: `translated_text` is ALWAYS the transcript
    expressed in the selected language (echo unchanged when it already matches).

    Returns JSON:
      {"source_language": str (the actual language the transcript text is in),
       "matches_requested": bool,
       "translated_text": str}
    """

    SYSTEM_PROMPT = (
        "You are the language-verification and translation step of the JeevSetu "
        "animal health assistant. You will be given a livestock symptom report "
        "transcript produced by a speech-to-text engine, and the language the "
        "farmer selected in the app.\n"
        "Tasks:\n"
        "1. Identify the language the transcript text is actually written in (the "
        "spoken language, judged by vocabulary, not just the alphabet). Careful: "
        "text in Latin letters may be English OR romanised Hindi/Hinglish; "
        "Bengali script means Bengali (or Assamese); Devanagari is Hindi or "
        "Marathi; Odia script is Odia. Bengali, Odia, Hindi and English are "
        "different languages and must not be treated as interchangeable.\n"
        "2. If the transcript already IS in the selected language (spoken language "
        "identifies it; romanised forms do not count for Hindi/Odia selections), "
        "mark matches_requested true and echo the text unchanged.\n"
        "3. If it does NOT match, translate it into the selected language: "
        "preserve the original meaning completely, keep all symptoms, counts, "
        "durations, body parts and medical terminology accurate, keep numbers, "
        "do not add or remove any information, do not diagnose, do not "
        "paraphrase away uncertainty. Keep code-switched words that are also "
        "natural in the target language.\n"
        "translated_text must ALWAYS be written in the selected language: for "
        "Hindi use Devanagari script, for Odia use Odia script, for English use "
        "the Latin alphabet (never romanised Devanagari or Odia).\n"
        "Respond ONLY with valid JSON: {\"source_language\": \"<the actual "
        "language of the transcript text>\", \"matches_requested\": <true|false>, "
        "\"translated_text\": \"<transcript in the selected language>\"}\n"
        "Do not invent or fabricate any symptom."
    )

    CONVERT_PROMPT_TEMPLATE = (
        "Rewrite the given text exactly in the native script of the requested "
        "language. This is NOT a translation: keep every word and the meaning "
        "identical, only convert the writing system (e.g. romanised Hindi \"meri "
        "gaay\" -> Devanagari Hindi \"मेरी गाय\"). The requested language is {target}. "
        "Respond ONLY with valid JSON: {\"converted_text\": \"<text in the native "
        "script>\", \"script\": \"<odiya|devanagari|latin>\"}."
    )

    def __init__(self):
        self.providers = []

        if settings.DEEPSEEK_API_KEY and settings.DEEPSEEK_API_KEY.startswith("nvapi-"):
            self.providers.append(("nvidia_nim", NVIDIANIMAdapter(
                api_key=settings.DEEPSEEK_API_KEY,
                base_url=settings.DEEPSEEK_BASE_URL,
                model=settings.DEEPSEEK_MODEL,
            )))

        if settings.GROQ_API_KEY:
            self.providers.append(("groq", GroqAdapter(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.GROQ_BASE_URL,
                model=settings.GROQ_MODEL,
            )))

        if not self.providers:
            raise RuntimeError(
                "No language enforcement provider configured. "
                "Set DEEPSEEK_API_KEY (NVIDIA NIM) or GROQ_API_KEY (free tier at groq.com)."
            )

    async def _try_providers(self, system_prompt: str, user_text: str) -> dict:
        last_error = None
        for name, provider in self.providers:
            try:
                return await provider.generate_json(system_prompt, user_text, timeout=30.0)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                print(f"[language] provider '{name}' failed: {exc}", flush=True)
                continue
        if last_error:
            raise last_error
        raise RuntimeError("No language enforcement providers available")

    async def enforce_language(self, transcript: str, requested: str) -> dict:
        target = LANGUAGE_NAMES.get(requested, requested)
        user_text = (
            f"Selected language: {target}\n"
            f"Transcript: {transcript}"
        )
        return await self._try_providers(self.SYSTEM_PROMPT, user_text)

    async def convert_to_selected_script(self, text: str, requested: str) -> dict:
        """
        Corrective call used ONLY when the first response's text is right in
        language but wrong in script (e.g. romanised Hindi for a Hindi
        selection). Rewrites the text in the selected language's native script
        without translating or rewording. Single targeted retry, not a loop.
        """
        target = LANGUAGE_NAMES.get(requested, requested)
        system_prompt = self.CONVERT_PROMPT_TEMPLATE.format(target=target)
        return await self._try_providers(system_prompt, text)


__EXPECTED_SCRIPT__ = {"odia": "odia", "hindi": "devanagari", "english": "latin"}


async def ensure_selected_language(transcript: str, requested: str, detected: str | None = None) -> dict:
    """
    Public entry point used by POST /api/audio/transcribe and
    POST /api/cases/enforce-language.

    Returns a dict:
      {
        "transcript": str  — text in the selected language, or the ORIGINAL text
                             when enforcement could not be completed (callers
                             must check language_enforcement and NOT display
                             unverified text).
        "requested_language": requested,
        "transcript_language": str|null   — the ACTUAL language detected in the
                                            provider transcript
        "language_translated": bool,
        "original_transcript": str,
        "language_enforcement": str — one of:
             "verified_match"     — provider transcript is the selected language
             "translated"         — translated to the selected language
             "unverified"         — no LLM key; script check inconclusive
             "enforcement_failed" — detected language mismatch that could not
                                    be fixed (e.g. Bengali for EN selected)
      }
    Never raises for LLM problems - the caller decides whether unverified text
    may be displayed.
    """
    requested = (requested or "").lower()
    result = {
        "transcript": transcript,
        "requested_language": requested,
        "transcript_language": None,
        "language_translated": False,
        "original_transcript": transcript,
    }
    if not transcript or not needs_verification(requested):
        result["language_enforcement"] = "verified_match" if transcript else "no_transcript"
        return result

    expected_script = __EXPECTED_SCRIPT__[requested]

    # 1. No LLM available: actual-language detection is impossible, so NOTHING
    #    is treated as verified — the caller must show an explicit error
    #    instead of displaying script-only "matches" (romanised Bengali/Hindi
    #    in Latin letters would otherwise pass a naive script check).
    if not settings.DEEPSEEK_API_KEY:
        result["language_enforcement"] = "unverified"
        return result

    # 2. One LLM call: detect the ACTUAL language and translate if needed.
    try:
        enforcer = LanguageEnforcer()
        check = await enforcer.enforce_language(transcript, requested)
    except Exception as exc:  # network / parse failures
        print(f"[language_service] enforcement error ({type(exc).__name__}): {exc}", flush=True)
        result["language_enforcement"] = "enforcement_failed"
        return result

    source_lang = check.get("source_language")
    source_norm = normalize_source_language(source_lang)
    matches = bool(check.get("matches_requested"))
    candidate = check.get("translated_text") or transcript

    # 3. Trust check: requires the LLM to not mislabel an actual language.
    if matches and source_norm != requested:
        print(f"[language_service] LLM claimed match but detected '{source_norm}' "
              f"(requested '{requested}') — treating as mismatch.", flush=True)
        matches = False

    # 4. Failure / mismatch -> the LLM was asked to translate already.
    if not matches:
        # Copy-edit the ACTUAL language of the ORIGINAL transcript.
        result["transcript_language"] = source_norm or source_lang
        result["original_transcript"] = transcript
        # The candidate text must actually be in the selected language's script.
        if candidate and script_dominates(candidate, expected_script):
            result["transcript"] = candidate
            result["language_translated"] = True
            result["language_enforcement"] = "translated"
            return result
        print(f"[language_service] translation candidate failed script check for "
              f"'{requested}' (script_profile: {script_profile(candidate)}).", flush=True)
        result["language_enforcement"] = "enforcement_failed"
        return result

    # 5. Claimed match: the text must still be in the selected language's script
    #    (catches romanised Hindi/Odia echoing English/Latin text, etc.).
    result["original_transcript"] = transcript
    if candidate and script_dominates(candidate, expected_script):
        result["transcript"] = candidate
        result["transcript_language"] = source_norm or requested
        result["language_enforcement"] = "verified_match"
        return result

    # Script-only problem (right language, wrong writing system): one
    # corrective call, bounded, not a retry loop.
    try:
        converted = await enforcer.convert_to_selected_script(candidate, requested)
        converted_text = converted.get("converted_text") or ""
        if converted_text and script_dominates(converted_text, expected_script):
            result["transcript"] = converted_text
            result["transcript_language"] = source_norm or requested
            result["language_enforcement"] = "translated"
            result["language_translated"] = False
            result["script_converted"] = True
            return result
    except Exception as exc:
        print(f"[language_service] script conversion error ({type(exc).__name__}): {exc}", flush=True)

    print(f"[language_service] claimed match failed script check for '{requested}'", flush=True)
    result["language_enforcement"] = "enforcement_failed"
    return result
