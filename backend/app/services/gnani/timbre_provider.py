import httpx
from app.core.config import settings
from app.services.gnani.base import VoiceProvider


# App language key -> Gnani Timbre BCP-47 language code
LANGUAGE_CODES = {
    "odia": "or-IN",
    "hindi": "hi-IN",
    "english": "en-IN",
}


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

        # Map app language key to Gnani BCP-47 code (e.g. "odia" -> "or-IN")
        lang_code = LANGUAGE_CODES.get(language, language)

        payload = {
            "text": text,
            "voice": "Shivani",
            "model": self.model,
            "language": lang_code,
            "speed": 1.0
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(url, headers=headers, json=payload)

        if response.status_code == 429:
            from app.services.llm.base import ProviderTransientError
            raise ProviderTransientError(
                "gnani_timbre", "quota/rate limit (429)", status_code=429
            )
        if response.status_code in (401, 402, 403):
            from app.services.llm.base import ProviderAuthError
            raise ProviderAuthError(
                "gnani_timbre",
                f"api key/billing rejected ({response.status_code})",
                status_code=response.status_code,
            )
        if response.status_code >= 500:
            from app.services.llm.base import ProviderTransientError
            raise ProviderTransientError(
                "gnani_timbre", f"upstream error ({response.status_code})", status_code=response.status_code
            )
        if response.status_code != 200:
            from app.services.llm.base import ProviderTransientError
            detail = response.text[:200]
            raise ProviderTransientError(
                "gnani_timbre", f"request rejected ({response.status_code}): {detail}", status_code=response.status_code
            )

        return response.content
