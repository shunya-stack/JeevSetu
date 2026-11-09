"""
Translation service for JeevSetu multilingual voice workflow.

Translates transcripts between the farmer's spoken language and English
using NVIDIA NIM (primary) or Groq (free fallback). All API credentials are
read from the backend environment only.
"""

from app.core.config import settings
from app.services.llm.nvidia_nim_adapter import NVIDIANIMAdapter
from app.services.llm.groq_adapter import GroqAdapter


# Canonical app language -> full name for LLM prompts
LANGUAGE_NAMES = {
    "odia": "Odia (ଓଡ଼ିଆ)",
    "hindi": "Hindi (हिन्दी)",
    "english": "English",
}


class NVIDIANIMTranslationProvider:
    """
    Translates livestock symptom transcripts between languages using NVIDIA NIM
    or Groq (free fallback). Tries NVIDIA NIM first, then Groq.
    """

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
                "No translation provider configured. "
                "Set DEEPSEEK_API_KEY (NVIDIA NIM) or GROQ_API_KEY (free tier at groq.com)."
            )

    async def _try_providers(self, system_prompt: str, user_text: str) -> dict:
        last_error = None
        for name, provider in self.providers:
            try:
                return await provider.generate_json(system_prompt, user_text, timeout=30.0)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                print(f"[translation] provider '{name}' failed: {exc}", flush=True)
                continue
        if last_error:
            raise last_error
        raise RuntimeError("No translation providers available")

    async def translate_to_english(
        self, transcript: str, source_language: str
    ) -> dict:
        """
        Translate a farmer's symptom transcript (in any supported language)
        into English for the veterinary operator.
        """
        source_name = LANGUAGE_NAMES.get(source_language, source_language)
        system_prompt = (
            "You are the translation step of the JeevSetu animal health assistant. "
            "You will be given a livestock symptom report transcript written in "
            f"{source_name} (or code-mixed speech containing it).\n"
            "Translate the ENTIRE transcript into English, preserving:\n"
            "- Every symptom, body part, and observation mentioned\n"
            "- Duration, timing, and frequency (e.g. '2 days', 'since yesterday')\n"
            "- Feed/water intake changes\n"
            "- Milk production changes\n"
            "- Numbers, counts, and quantities\n"
            "- Medical terminology\n"
            "- Uncertainty or vagueness expressed by the farmer\n\n"
            "Do NOT:\n"
            "- Add symptoms or observations not in the source\n"
            "- Remove or soften any reported symptom\n"
            "- Diagnose, prescribe, or suggest treatment\n"
            "- Paraphrase away uncertainty (e.g. keep 'seems like' or 'maybe')\n"
            "- Change the meaning in any way\n\n"
            "Respond ONLY with valid JSON: "
            "{\"translated_text\": \"<full English transcript>\", "
            "\"source_language\": \"<detected source language>\", "
            "\"notes\": \"<any translation caveats or empty string>\"}"
        )
        user_text = (
            f"Source language: {source_name}\n"
            f"Transcript to translate: {transcript}"
        )
        return await self._try_providers(system_prompt, user_text)

    async def translate_to_selected_language(
        self, english_text: str, target_language: str
    ) -> dict:
        """
        Translate an English operator-facing report back into the farmer's
        selected language for display (not TTS).
        """
        target_name = LANGUAGE_NAMES.get(target_language, target_language)
        system_prompt = (
            "You are the translation step of the JeevSetu animal health assistant. "
            "You will be given an English summary of a farmer's livestock symptom "
            "report. Translate it into "
            f"{target_name} for display to the farmer.\n\n"
            "The translation must:\n"
            "- Sound natural when read in "
            f"{target_name}\n"
            "- Include every symptom, duration, feed change, and milk change\n"
            "- Preserve numbers and quantities exactly\n"
            "- Not add, remove, or rephrase any clinical detail\n"
            "- Not diagnose or prescribe\n\n"
            "For Odia: use Odia script (ଓଡ଼ିଆ). For Hindi: use Devanagari script "
            "(हिन्दी). For English: use plain English.\n\n"
            "Respond ONLY with valid JSON: "
            "{\"translated_text\": \"<full translation in "
            f"{target_name}>\", \"target_language\": \"{target_language}\", "
            "\"notes\": \"<any translation caveats or empty string>\"}"
        )
        user_text = (
            f"Target language: {target_name}\n"
            f"English report to translate: {english_text}"
        )
        return await self._try_providers(system_prompt, user_text)

    async def generate_localized_summary(
        self, english_report: dict, target_language: str
    ) -> dict:
        """
        Generate a localized summary of the extracted symptoms for the farmer.
        Input is the English operator report (symptom extraction + triage).
        Output is a structured summary in the farmer's selected language.
        """
        target_name = LANGUAGE_NAMES.get(target_language, target_language)
        symptoms = english_report.get("symptoms_reported", [])
        symptom_list = ", ".join(
            s.get("value", "") for s in symptoms if s.get("value")
        ) or "No specific symptoms reported"
        duration = english_report.get("symptom_duration", "Not provided")
        feeding = english_report.get("eating_or_drinking_change", "Not provided")
        milk = english_report.get("milk_production_change", "Not provided")
        animal_type = english_report.get("animal_type", "Not specified")
        system_prompt = (
            "You are the summary step of the JeevSetu animal health assistant. "
            "You will be given extracted clinical observations from a farmer's "
            "livestock symptom report (in English). Generate a structured summary "
            f"in {target_name} for the farmer to review.\n\n"
            "Include ONLY:\n"
            "- Animal type\n"
            "- Reported symptoms (exactly as extracted, do not add new ones)\n"
            "- Duration of symptoms\n"
            "- Feed and water intake changes\n"
            "- Milk production changes\n"
            "- Other observations\n\n"
            "Do NOT:\n"
            "- Invent symptoms or clinical facts not in the source\n"
            "- Diagnose, prescribe, or suggest treatment\n"
            "- Add information not present in the extraction\n\n"
            "Respond ONLY with valid JSON: "
            "{\"summary\": \"<structured summary in "
            f"{target_name}>\", \"target_language\": \"{target_language}\", "
            "\"notes\": \"<any caveats or empty string>\"}"
        )
        user_text = (
            f"Target language: {target_name}\n"
            f"Animal type: {animal_type}\n"
            f"Symptoms: {symptom_list}\n"
            f"Duration: {duration}\n"
            f"Feed and water: {feeding}\n"
            f"Milk production: {milk}\n"
            f"Other observations: {english_report.get('other_observations', [])}\n"
        )
        return await self._try_providers(system_prompt, user_text)

    async def generate_localized_recommendations(
        self, english_report: dict, triage_result: dict, target_language: str
    ) -> dict:
        """
        Generate localized recommended actions for the farmer based on
        extracted symptoms and triage evaluation.
        """
        target_name = LANGUAGE_NAMES.get(target_language, target_language)
        urgency = triage_result.get("urgency_level", "review")
        urgency_reasons = triage_result.get("urgency_reasons", [])
        immediate_actions = triage_result.get("immediate_actions", [])
        symptoms = english_report.get("symptoms_reported", [])
        symptom_list = ", ".join(
            s.get("value", "") for s in symptoms if s.get("value")
        ) or "No specific symptoms"
        system_prompt = (
            "You are the recommendation step of the JeevSetu animal health assistant. "
            "You will be given extracted symptoms and a triage evaluation "
            "(in English). Generate practical, cautious next steps for the farmer "
            f"in {target_name}.\n\n"
            "Include ONLY:\n"
            "- Immediate actions the farmer can safely take\n"
            "- What to monitor in the animal\n"
            "- What to avoid (no medications, no unprescribed treatments)\n"
            "- Whether veterinary assistance is needed\n"
            "- Urgency of veterinary attention\n"
            "- Emergency warning signs where relevant\n\n"
            "Do NOT:\n"
            "- Prescribe medicines, dosages, or injections\n"
            "- Diagnose diseases\n"
            "- Suggest treatments beyond general care\n"
            "- Add clinical information not in the triage\n\n"
            "Respond ONLY with valid JSON: "
            "{\"recommendations\": \"<structured recommendations in "
            f"{target_name}>\", \"target_language\": \"{target_language}\", "
            "\"notes\": \"<any caveats or empty string>\"}"
        )
        user_text = (
            f"Target language: {target_name}\n"
            f"Urgency level: {urgency}\n"
            f"Triage reasons: {'; '.join(urgency_reasons) or 'None'}\n"
            f"Immediate actions: {'; '.join(immediate_actions) or 'None'}\n"
            f"Symptoms: {symptom_list}\n"
        )
        return await self._try_providers(system_prompt, user_text)


def get_translation_provider() -> NVIDIANIMTranslationProvider:
    """Factory: returns a TranslationProvider backed by NVIDIA NIM or Groq."""
    return NVIDIANIMTranslationProvider()
