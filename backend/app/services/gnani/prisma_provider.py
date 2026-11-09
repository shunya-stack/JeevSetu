import httpx
from app.core.config import settings
from app.services.gnani.base import SpeechProvider

class GnaniPrismaProvider(SpeechProvider):
    """
    Live Gnani Prisma speech-to-text adapter.
    Endpoint: POST https://api.vachana.ai/stt/v3
    Header: X-API-Key-ID: <key>
    """
    def __init__(self, api_key: str, base_url: str = "https://api.vachana.ai", model: str = "prisma-v3.0"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model

    # JeevSetu app hints -> Gnani Vachana `language_code` values.
    # Verified against the live API + docs.gnani.ai (2026-11-08):
    #  - Vachana only supports: bn-IN, en-IN, gu-IN, hi-IN, kn-IN, ml-IN,
    #    mr-IN, pa-IN, ta-IN, te-IN (+ `indic-auto` on prisma-v3.0).
    #  - Odia (or-IN) is NOT supported: the endpoint rejects it with
    #    INVALID_LANGUAGE_CODE and `indic-auto` detection does not cover Odia.
    #    Odia selection therefore falls back to indic-auto "best effort" here,
    #    and language enforcement/translation is applied downstream
    #    (app.services.language_service.ensure_selected_language).
    #  - `language_code` is a HINT, not a lock: the transcript follows the
    #    language actually spoken. Downstream enforcement compensates.
    LANGUAGE_CODES = {
        "odia": "indic-auto",
        "hindi": "hi-IN",
        "english": "en-IN"
    }

    async def transcribe(self, audio_bytes: bytes, filename: str, language_hint: str = "odia") -> dict:
        url = f"{self.base_url}/stt/v3"
        headers = {
            "X-API-Key-ID": self.api_key
        }
        files = {
            "audio_file": (filename or "recording.wav", audio_bytes, "audio/wav")
        }
        data = {
            "model": self.model,
            "format": "transcribe"
        }

        # Vachana requires a supported language_code (e.g. hi-IN, indic-auto).
        # Unknown/unmapped hints must NOT be passed through verbatim — the API
        # rejects them with 400 INVALID_LANGUAGE_CODE.
        hint = (language_hint or "").lower()
        data["language_code"] = self.LANGUAGE_CODES.get(hint, "indic-auto")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, files=files, data=data)
            response.raise_for_status()
            res_json = response.json()

            # Format standardized response
            transcript = res_json.get("transcript") or res_json.get("text") or ""
            return {
                "transcript": transcript,
                "detected_language": res_json.get("detected_language_code") or res_json.get("language") or language_hint,
                "requested_app_language": language_hint,
                "provider_language_code": data["language_code"],
                "confidence": res_json.get("confidence", 0.92),
                "provider": "gnani_prisma",
                "is_demo": False
            }

