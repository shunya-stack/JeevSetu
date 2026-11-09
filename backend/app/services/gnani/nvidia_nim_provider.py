"""
NVIDIA NIM reasoning provider for structured symptom extraction.

Wraps app.services.llm.nvidia_nim_adapter.NVIDIANIMAdapter so it matches the
gnani ReasoningProvider interface (extract_case). NVIDIA NIM is the primary
(and only) LLM provider for JeevSetu — no DeepSeek, no Evon, no Gemini.

NVIDIA_NIM_API_KEY is read from the environment only — never hardcoded.
"""

from app.core.config import settings
from app.services.llm.nvidia_nim_adapter import NVIDIANIMAdapter
from app.services.language_service import LANGUAGE_NAMES


class NVIDIANIMReasoningProvider:
    """
    NVIDIA NIM-backed reasoning provider for symptom extraction.

    Returns parsed JSON plus provider="nvidia_nim" and is_demo=False.
    """

    def __init__(self, api_key: str, model: str = settings.DEEPSEEK_MODEL):
        self.provider = NVIDIANIMAdapter(
            api_key=api_key,
            base_url=settings.DEEPSEEK_BASE_URL,
            model=model,
        )
        self.id = "nvidia_nim"

    async def extract_case(self, transcript: str, animal_context: dict) -> dict:
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
