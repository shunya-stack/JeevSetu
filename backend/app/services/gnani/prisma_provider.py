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
            "output_style": "transcribe"
        }

        # If user explicitly specified Odia or Hindi
        if language_hint:
            data["language"] = language_hint

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, files=files, data=data)
            response.raise_for_status()
            res_json = response.json()

            # Format standardized response
            transcript = res_json.get("transcript") or res_json.get("text") or ""
            return {
                "transcript": transcript,
                "detected_language": res_json.get("language", language_hint),
                "confidence": res_json.get("confidence", 0.92),
                "provider": "gnani_prisma",
                "is_demo": False
            }

