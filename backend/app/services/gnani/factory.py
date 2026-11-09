import json

from app.core.config import settings
from app.services.gnani.base import SpeechProvider, ReasoningProvider, VoiceProvider
from app.services.gnani.prisma_provider import GnaniPrismaProvider
from app.services.gnani.timbre_provider import GnaniTimbreProvider
from app.services.llm.nvidia_nim_adapter import NVIDIANIMAdapter
from app.services.llm.groq_adapter import GroqAdapter


class FallbackReasoningProvider(ReasoningProvider):
    """
    Tries configured reasoning providers in order; raises the last error
    if ALL providers fail (no silent demo fallback in live mode).
    """

    def __init__(self, providers: list):
        self.providers = providers

    async def extract_case(self, transcript: str, animal_context: dict) -> dict:
        last_error = None
        for provider in self.providers:
            name = getattr(provider, "id", type(provider).__name__)
            try:
                return await provider.extract_case(transcript, animal_context)
            except Exception as exc:  # noqa: BLE001 — any provider error triggers fallback
                last_error = exc
                print(
                    f"[reasoning] provider '{name}' failed: {exc}", flush=True
                )
                continue
        if last_error:
            raise last_error
        raise RuntimeError("No reasoning providers available")


def get_speech_provider() -> SpeechProvider:
    if settings.AI_PROVIDER_MODE == "live":
        if not settings.GNANI_API_KEY:
            raise RuntimeError(
                "AI_PROVIDER_MODE=live but GNANI_API_KEY is not configured."
            )
        return GnaniPrismaProvider(
            api_key=settings.GNANI_API_KEY,
            base_url=settings.GNANI_API_BASE_URL,
            model=settings.GNANI_PRISMA_MODEL
        )
    raise RuntimeError(
        "AI_PROVIDER_MODE is not 'live'. Set AI_PROVIDER_MODE=live and configure GNANI_API_KEY."
    )


def get_reasoning_provider() -> ReasoningProvider:
    if settings.AI_PROVIDER_MODE != "live":
        raise RuntimeError(
            "AI_PROVIDER_MODE is not 'live'. Set AI_PROVIDER_MODE=live and configure an LLM API key."
        )

    providers = []

    # 1. NVIDIA NIM (primary — requires deploying a model on build.nvidia.com)
    if settings.DEEPSEEK_API_KEY and settings.DEEPSEEK_API_KEY.startswith("nvapi-"):
        providers.append(
            NVIDIANIMReasoningProvider(
                api_key=settings.DEEPSEEK_API_KEY,
                model=settings.DEEPSEEK_MODEL,
            )
        )

    # 2. Groq (free tier — sign up at https://groq.com, no credit card required)
    if settings.GROQ_API_KEY:
        providers.append(
            GroqReasoningProvider(
                api_key=settings.GROQ_API_KEY,
                model=settings.GROQ_MODEL,
            )
        )

    # 3. Gnani Evon (last resort — requires GNANI_API_KEY with Evon scope)
    if settings.GNANI_API_KEY:
        providers.append(
            GnaniEvonProvider(
                api_key=settings.GNANI_API_KEY,
                base_url=settings.GNANI_API_BASE_URL,
                model=settings.GNANI_EVON_MODEL
            )
        )

    if not providers:
        raise RuntimeError(
            "AI_PROVIDER_MODE=live but no reasoning provider API keys are configured. "
            "Set GROQ_API_KEY (free tier at groq.com) or DEEPSEEK_API_KEY (NVIDIA NIM)."
        )

    return FallbackReasoningProvider(providers)


def get_voice_provider() -> VoiceProvider:
    if settings.AI_PROVIDER_MODE == "live":
        if not settings.GNANI_API_KEY:
            raise RuntimeError(
                "AI_PROVIDER_MODE=live but GNANI_API_KEY is not configured."
            )
        return GnaniTimbreProvider(
            api_key=settings.GNANI_API_KEY,
            base_url=settings.GNANI_API_BASE_URL,
            model=settings.GNANI_TIMBRE_MODEL
        )
    raise RuntimeError(
        "AI_PROVIDER_MODE is not 'live'. Set AI_PROVIDER_MODE=live and configure GNANI_API_KEY."
    )


# Imported at bottom to avoid circular imports
from app.services.llm.nvidia_nim_adapter import NVIDIANIMAdapter  # noqa: E402
from app.services.llm.groq_adapter import GroqAdapter  # noqa: E402

# Reasoning provider wrappers that match the gnani ReasoningProvider interface
class NVIDIANIMReasoningProvider:
    def __init__(self, api_key: str, model: str = settings.DEEPSEEK_MODEL):
        self.provider = NVIDIANIMAdapter(
            api_key=api_key,
            base_url=settings.DEEPSEEK_BASE_URL,
            model=model,
        )
        self.id = "nvidia_nim"

    async def extract_case(self, transcript: str, animal_context: dict) -> dict:
        from app.services.language_service import LANGUAGE_NAMES
        output_language = LANGUAGE_NAMES.get(
            str(animal_context.get("language", "odia")).lower(),
            LANGUAGE_NAMES["odia"],
        )
        system_prompt = (
            "You are the clinical intake parser for JeevSetu animal health assistant. "
            f"The transcript may be written in any language. Respond in {output_language}: "
            f"every human-readable value (symptoms_reported.value, symptom_duration, "
            f"eating_or_drinking_change, milk_production_change, other_observations, "
            f"unknown_fields) must be written in {output_language}. Keep the JSON keys in "
            "English. Copy each symptom's source_text VERBATIM from the transcript, in its "
            "original language. Set the 'language' field to exactly the requested app "
            "language name without the code suffix. Preserve medical terminology and the "
            "original meaning; do not simplify it away. "
            "Extract reported symptoms into valid JSON strictly following this schema: "
            "animal_type, language, symptoms_reported (list of {value, source_text, confidence}), "
            "symptom_duration, eating_or_drinking_change, milk_production_change, other_observations, unknown_fields. "
            "Use empty lists [] for other_observations and unknown_fields when there are no entries, never null. "
            "DO NOT INVENT symptoms. DO NOT prescribe medicines or dosages."
        )
        user_text = f"Animal: {animal_context.get('animal_type', 'cow')}\nTranscript: {transcript}"
        result = await self.provider.generate_json(system_prompt, user_text, timeout=30.0)
        result["provider"] = "nvidia_nim"
        result["is_demo"] = False
        return result


class GroqReasoningProvider:
    def __init__(self, api_key: str, model: str = settings.GROQ_MODEL):
        self.provider = GroqAdapter(
            api_key=api_key,
            base_url=settings.GROQ_BASE_URL,
            model=model,
        )
        self.id = "groq"

    async def extract_case(self, transcript: str, animal_context: dict) -> dict:
        from app.services.language_service import LANGUAGE_NAMES
        output_language = LANGUAGE_NAMES.get(
            str(animal_context.get("language", "odia")).lower(),
            LANGUAGE_NAMES["odia"],
        )
        system_prompt = (
            "You are the clinical intake parser for JeevSetu animal health assistant. "
            f"The transcript may be written in any language. Respond in {output_language}: "
            f"every human-readable value (symptoms_reported.value, symptom_duration, "
            f"eating_or_drinking_change, milk_production_change, other_observations, "
            f"unknown_fields) must be written in {output_language}. Keep the JSON keys in "
            "English. Copy each symptom's source_text VERBATIM from the transcript, in its "
            "original language. Set the 'language' field to exactly the requested app "
            "language name without the code suffix. Preserve medical terminology and the "
            "original meaning; do not simplify it away. "
            "Extract reported symptoms into valid JSON strictly following this schema: "
            "animal_type, language, symptoms_reported (list of {value, source_text, confidence}), "
            "symptom_duration, eating_or_drinking_change, milk_production_change, other_observations, unknown_fields. "
            "Use empty lists [] for other_observations and unknown_fields when there are no entries, never null. "
            "DO NOT INVENT symptoms. DO NOT prescribe medicines or dosages."
        )
        user_text = f"Animal: {animal_context.get('animal_type', 'cow')}\nTranscript: {transcript}"
        result = await self.provider.generate_json(system_prompt, user_text, timeout=30.0)
        result["provider"] = "groq"
        result["is_demo"] = False
        return result


class GnaniEvonProvider(ReasoningProvider):
    """
    Gnani Evon v3.3 reasoning adapter for structured symptom extraction.
    Sends prompt to Gnani's managed LLM / Plexus API endpoint.
    """

    def __init__(self, api_key: str, base_url: str = "https://api.vachana.ai", model: str = "gnani-evon-v3.3-30B-A3B"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def extract_case(self, transcript: str, animal_context: dict) -> dict:
        import httpx
        from app.services.language_service import LANGUAGE_NAMES

        url = f"{self.base_url}/api/v1/chat/completions"
        headers = {
            "X-API-Key-ID": self.api_key,
            "Content-Type": "application/json"
        }

        output_language = LANGUAGE_NAMES.get(
            str(animal_context.get("language", "odia")).lower(),
            LANGUAGE_NAMES["odia"]
        )
        system_prompt = (
            "You are the clinical intake parser for JeevSetu animal health assistant. "
            f"The transcript may be written in any language. Respond in {output_language}: "
            f"every human-readable value (symptoms_reported.value, symptom_duration, "
            f"eating_or_drinking_change, milk_production_change, other_observations, "
            f"unknown_fields) must be written in {output_language}. Keep the JSON keys in "
            "English. Copy each symptom's source_text VERBATIM from the transcript, in its "
            "original language. Set the 'language' field to exactly the requested app "
            "language name without the code suffix. Preserve medical terminology and the "
            "original meaning; do not simplify it away. "
            "Extract reported symptoms into valid JSON strictly following this schema: "
            "animal_type, language, symptoms_reported (list of {value, source_text, confidence}), "
            "symptom_duration, eating_or_drinking_change, milk_production_change, other_observations, unknown_fields. "
            "Use empty lists [] for other_observations and unknown_fields when there are no entries, never null. "
            "DO NOT INVENT symptoms. DO NOT prescribe medicines or dosages."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Animal: {animal_context.get('animal_type', 'cow')}\nTranscript: {transcript}"}
            ],
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            res = response.json()
            content = res["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            parsed["provider"] = "gnani_evon"
            parsed["is_demo"] = False
            return parsed
