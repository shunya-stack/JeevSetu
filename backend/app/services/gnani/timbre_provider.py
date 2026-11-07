import httpx
from app.services.gnani.base import VoiceProvider

class GnaniTimbreProvider(VoiceProvider):
    """
    Gnani Timbre v3.0 voice synthesis adapter.
    Endpoint: POST https://api.vachana.ai/api/v1/tts/inference
    """
    def __init__(self, api_key: str, base_url: str = "https://api.vachana.ai", model: str = "timbre-v3.0"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def synthesize(self, text: str, language: str = "hi-IN") -> bytes:
        url = f"{self.base_url}/api/v1/tts/inference"
        headers = {
            "X-API-Key-ID": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "voice": "Nalini",
            "model": self.model,
            "language": language,
            "speed": 1.0
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.content

