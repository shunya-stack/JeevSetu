"""
Base abstractions for the JeevSetu LLM provider fallback stack.

Scope (verified requirement): the fallback stack covers ONLY LLM operations —
language enforcement/translation and symptom extraction. It never touches the
Gnani STT (Prisma), TTS (Timbre) or voice-recording workflow, which keep their
own dedicated providers.

Every adapter must:
- expose a stable ``id`` matching a slot in ``settings.LLM_PROVIDER_STACK``,
- accept the SAME abstract call (system prompt + user text),
- return a parsed JSON object, raising typed ProviderError subclasses on
  failure so the router can decide cooldowns and fallback.
"""

from abc import ABC, abstractmethod
from typing import Any


class LLMError(Exception):
    """Base class for all LLM-stack errors."""


class ProviderError(LLMError):
    """A specific provider failed. The router walks on to the next one."""

    def __init__(self, provider_id: str, message: str, status_code: int | None = None):
        super().__init__(message)
        self.provider_id = provider_id
        self.message = message
        self.status_code = status_code


class ProviderTransientError(ProviderError):
    """Retryable failure: 429/quota, 5xx, timeouts, connection errors."""


class ProviderAuthError(ProviderError):
    """Permanent-for-now failure: invalid key (401) or no billing (402/403)."""


class ProviderBadResponseError(ProviderError):
    """HTTP 200 but the body was not usable JSON of the expected shape."""


class AllProvidersFailedError(LLMError):
    """
    Every enabled provider failed (or is cooling down). Callers MUST convert
    this into a CONTROLLED, retryable error — never a silent fallback to
    wrong data and never a false success.
    """


class LLMProvider(ABC):
    """A single configured LLM endpoint (one fallback slot)."""

    #: Slot id; must equal an entry of settings.LLM_PROVIDER_STACK.
    id: str = "unknown"

    @abstractmethod
    async def generate_json(self, system_prompt: str, user_text: str, timeout: float) -> dict[str, Any]:
        """Run one JSON-mode completion and return the parsed object."""
        raise NotImplementedError
