from app.services.provider_base import SpeechProvider, ReasoningProvider, VoiceProvider


class DemoSpeechProvider(SpeechProvider):
    """
    Demo Speech provider. No sample transcripts — only real user audio is transcribed.
    Clearly labeled as DEMO MODE in UI and responses.
    """

    async def transcribe(self, audio_bytes: bytes, filename: str, language_hint: str = "odia") -> dict:
        lang = language_hint if language_hint in ("odia", "hindi", "english") else "odia"

        return {
            "transcript": "",
            "detected_language": lang,
            "requested_app_language": language_hint,
            "confidence": 0.0,
            "provider": "demo_speech",
            "is_demo": True,
            "note": "DEMO MODE — Real Bhashini ASR credentials required for transcription."
        }


class DemoReasoningProvider(ReasoningProvider):
    """
    Demo reasoning provider. No predefined symptom mappings — only real user transcripts are analyzed.
    """

    async def extract_case(self, transcript: str, animal_context: dict) -> dict:
        return {
            "animal_type": animal_context.get("animal_type", ""),
            "language": animal_context.get("language", ""),
            "symptoms_reported": [],
            "symptom_duration": "",
            "eating_or_drinking_change": "",
            "milk_production_change": "",
            "other_observations": [],
            "unknown_fields": [],
            "requires_human_review": True,
            "provider": "demo_reasoning",
            "is_demo": True,
            "note": "DEMO MODE — Real Evon credentials required for clinical analysis."
        }


class DemoVoiceProvider(VoiceProvider):
    async def synthesize(self, text: str, language: str = "hi-IN") -> bytes:
        return b""
