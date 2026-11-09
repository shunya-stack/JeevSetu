"""
AI provider factory for JeevSetu.

Migration target (v2 pipeline):
  - Speech-to-text:  Bhashini ASR (Odia, Hindi, English; auto-detect supported)
  - Analysis:        Evon v3.3 (OpenAI-compatible structured case analysis)
  - Translation:     Bhashini NMT (farmer transcript <-> English, and
                     farmer-facing dynamic content into the display language)
  - TTS:             Bhashini TTS

Provider mode:
  AI_PROVIDER_MODE=live   -> real integrations (need credits configured)
  AI_PROVIDER_MODE=demo   -> clearly labelled DEMO adapters shipped with the app

All credentials stay in the backend environment. Nothing here talks to the
frontend directly — the FastAPI routes are the only entry point.
"""

from app.core.config import settings
from app.services.provider_base import ReasoningProvider, SpeechProvider, VoiceProvider
from app.services.demo_providers import (
    DemoReasoningProvider,
    DemoSpeechProvider,
    DemoVoiceProvider,
)
from app.services.bhashini_service import (
    BhashiniError,
    app_lang,
    bhashini_lang,
    get_bhashini_client,
)
from app.services.evon_service import EvonCaseAnalyzer, EvonError, get_evon_analyzer


class _MissingConfigError(RuntimeError):
    pass


def provider_mode() -> str:
    return "live" if settings.AI_PROVIDER_MODE == "live" else "demo"


def is_live() -> bool:
    return provider_mode() == "live"


def _live_required_error(what: str, env_hint: str) -> RuntimeError:
    return RuntimeError(
        f"AI_PROVIDER_MODE={settings.AI_PROVIDER_MODE}: {what} is not configured. "
        f"Set {env_hint} in the backend environment."
    )


# ---------------------------------------------------------------------------
# Speech-to-text (Bhashini ASR)
# ---------------------------------------------------------------------------

class BhashiniSpeechProvider(SpeechProvider):
    """Bhashini ASR adapter exposing the SpeechProvider interface."""

    id = "bhashini_asr"

    def __init__(self):
        self.client = get_bhashini_client()

    async def transcribe(self, audio_bytes: bytes, filename: str, language_hint: str = "odia") -> dict:
        if not self.client.asr_configured:
            raise _live_required_error("Bhashini ASR", "BHASHINI_API_KEY and BHASHINI_ASR_URL")

        ext = (filename or "").lower().rsplit(".", 1)[-1] if filename else ""
        audio_format = ext if ext else "wav"

        requested = (language_hint or "odia").lower()
        result = await self.client.transcribe(
            audio_bytes,
            audio_format=audio_format,
            app_language=requested,
        )
        return {
            "transcript": result["transcript"],
            "detected_language": result.get("detected_language") or requested,
            "requested_app_language": requested,
            "provider": self.id,
            "is_demo": False,
        }


# ---------------------------------------------------------------------------
# Reasoning / structured case analysis (Evon v3.3)
# ---------------------------------------------------------------------------

class EvonReasoningProvider(ReasoningProvider):
    """
    Evon v3.3 adapter exposing the ReasoningProvider interface.

    Input transcript is expected to be in ENGLISH (spec: Bhashini translates
    the farmer transcript first). Output contains the full structured case.
    """

    id = "evon"

    def __init__(self):
        self.analyzer: EvonCaseAnalyzer = get_evon_analyzer()

    async def extract_case(self, transcript: str, animal_context: dict) -> dict:
        if not self.analyzer.configured:
            raise _live_required_error("Evon", "EVON_API_URL, EVON_API_KEY and EVON_MODEL")
        return await self.analyzer.analyze_english_transcript(
            transcript,
            animal_type=animal_context.get("animal_type") or "cow",
        )


# ---------------------------------------------------------------------------
# TTS
# ---------------------------------------------------------------------------

class BhashiniVoiceProvider(VoiceProvider):
    """Bhashini TTS adapter exposing the VoiceProvider interface."""

    id = "bhashini_tts"

    def __init__(self):
        self.client = get_bhashini_client()

    async def synthesize(self, text: str, language: str = "odia") -> bytes:
        if not self.client.tts_configured:
            raise _live_required_error("Bhashini TTS", "BHASHINI_API_KEY and BHASHINI_TTS_URL")
        return await self.client.synthesize_speech(text, app_language=language)


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------

def get_speech_provider() -> SpeechProvider:
    if is_live():
        return BhashiniSpeechProvider()
    return DemoSpeechProvider()


def get_reasoning_provider() -> ReasoningProvider:
    if is_live():
        provider = EvonReasoningProvider()
        if not provider.analyzer.configured:
            raise _live_required_error("Evon", "EVON_API_URL, EVON_API_KEY and EVON_MODEL")
        return provider
    return DemoReasoningProvider()


def get_voice_provider() -> VoiceProvider:
    if is_live():
        return BhashiniVoiceProvider()
    return DemoVoiceProvider()


def get_translation_services():
    """Returns the shared Bhashini client used for every translation."""
    return get_bhashini_client()
