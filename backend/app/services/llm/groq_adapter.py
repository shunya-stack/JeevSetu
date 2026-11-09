"""
Groq adapter — free LLM provider for JeevSetu.

Groq offers a free tier (no credit card required) at https://groq.com.
Exposes an OpenAI-compatible chat/completions endpoint.

GROQ_API_KEY is read from the environment only — never hardcoded.
"""

import json
from typing import Any

import httpx

from app.core.config import settings
from app.services.llm.base import (
    LLMProvider,
    ProviderAuthError,
    ProviderBadResponseError,
    ProviderTransientError,
)

DEFAULT_BASE_URL = "https://api.groq.com/openai/v1"
DEFAULT_MODEL = "llama-3.1-8b-instant"


class GroqAdapter(LLMProvider):
    id = "groq"

    def __init__(
        self,
        api_key: str,
        base_url: str = DEFAULT_BASE_URL,
        model: str = DEFAULT_MODEL,
    ):
        if not api_key:
            raise ValueError("GroqAdapter requires an API key")
        self.api_key = api_key
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self.model = model or DEFAULT_MODEL

    async def generate_json(
        self, system_prompt: str, user_text: str, timeout: float
    ) -> dict[str, Any]:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "max_tokens": 2048,
        }
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, headers=headers, json=payload)
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            raise ProviderTransientError(
                self.id, f"{type(exc).__name__} during request"
            ) from exc

        if response.status_code == 429:
            raise ProviderTransientError(self.id, "quota/rate limit (429)", status_code=429)
        if response.status_code in (401, 402, 403):
            raise ProviderAuthError(
                self.id,
                f"api key/billing rejected ({response.status_code})",
                status_code=response.status_code,
            )
        if response.status_code >= 500:
            raise ProviderTransientError(
                self.id, f"upstream error ({response.status_code})", status_code=response.status_code
            )
        if response.status_code != 200:
            raise ProviderTransientError(
                self.id, f"request rejected ({response.status_code})", status_code=response.status_code
            )

        try:
            body = response.json()
            text = body["choices"][0]["message"]["content"]
            return json.loads(text)
        except (json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
            raise ProviderBadResponseError(
                self.id, "response body was not valid JSON-mode output"
            ) from exc
