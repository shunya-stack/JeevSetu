"""
Evon v3.3 reasoning service — OpenAI-compatible chat completions client.

All requests go through the backend with the API key kept server-side.
Handles timeouts, non-200 responses, malformed JSON, incomplete generations
and removes the model's <think> chain-of-thought wrapper from output.
"""

import json
import re
import time
import httpx

from app.core.config import settings
from app.services.language_service import LANGUAGE_NAMES


# Reasoning wrapper tokens built at runtime (tag fragments are stripped from
# every assistant completion before presentation; they must never reach UI).
_TAG = chr(116) + "hink"
OPEN_TAG = "<" + _TAG + ">"
CLOSE_TAG = "</" + _TAG + ">"


def strip_reasoning_wrappers(text: str) -> str:
    """
    Evon may emit chain-of-thought wrapper blocks such as

       <think> ... </think>

    which are reasoning artifacts, not presentation content. Remove every
    COMPLETE wrapper block (tags *and* inner reasoning text) plus any stray
    tag fragments, then trim.
    """
    if not text:
        return ""
    cleaned = text
    o, c = OPEN_TAG, CLOSE_TAG
    pattern = re.escape(o) + r".*?" + re.escape(c)
    cleaned = re.sub(pattern, "", cleaned, flags=re.DOTALL | re.IGNORECASE)
    cleaned = cleaned.replace(o, "").replace(c, "")
    # Banner-style artifacts some quantisations emit instead of tags
    cleaned = cleaned.replace("|IM_END|>", "").replace("|im_end|>", "")
    cleaned = re.sub(r"<\s*/?\s*" + "think" + r"[^>]*>", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()

def extract_json_object(text: str):
    """
    Recover a JSON object from the assistant content:
    1. Direct json.loads on the (unwrapped) content.
    2. Fenced ```json blocks.
    3. First balanced {...} region of the text.
    Raises ValueError when nothing parses.
    """
    cleaned = strip_reasoning_wrappers(text)

    candidates = [cleaned]
    candidates += re.findall(r"```(?:json)?\s*(.*?)```", cleaned, flags=re.DOTALL)

    for candidate in candidates:
        candidate = candidate.strip().strip("`")
        if not candidate:
            continue
        try:
            return json.loads(candidate)
        except (json.JSONDecodeError, ValueError):
            pass

        start = candidate.find("{")
        if start != -1:
            depth = 0
            in_string = False
            escape = False
            for i in range(start, len(candidate)):
                ch = candidate[i]
                if in_string:
                    if escape:
                        escape = False
                    elif ch == "\\":
                        escape = True
                    elif ch == '"':
                        in_string = False
                    continue
                if ch == '"':
                    in_string = True
                elif ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        blob = candidate[start:i + 1]
                        try:
                            return json.loads(blob)
                        except (json.JSONDecodeError, ValueError):
                            break

    raise ValueError("No JSON object found in Evon response")


class EvonError(Exception):
    """Raised when the Evon API fails, returns malformed output or times out."""


class EvonClient:
    """
    OpenAI-compatible chat-completions client for Evon v3.3.

    Bearer authentication against the configured endpoint. The endpoint stays
    configurable because the deployment in front of the model may change.
    """

    id = "evon"

    def __init__(
        self,
        api_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float | None = None,
    ):
        self.api_url = (api_url or settings.EVON_API_URL or "").rstrip("/")
        self.api_key = (api_key or settings.EVON_API_KEY or "").strip()
        self.model = model or settings.EVON_MODEL
        # Evon runs on modest hardware (llamacpp, slow prompt eval):
        # use a generous default timeout.
        self.timeout = timeout or settings.EVON_TIMEOUT

    @property
    def configured(self) -> bool:
        return bool(self.api_url and self.api_key and self.model)

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    @staticmethod
    def _unwrap(text: str) -> str:
        """Drop reasoning wrappers and stray tag fragments before presentation."""
        return strip_reasoning_wrappers(text)

    async def chat(self, system_prompt: str, user_text: str, max_tokens: int = 1600, temperature: float = 0.2) -> str:
        """
        Single-turn completion, streamed (SSE). Streaming matters here because
        Evon's prompt evaluation is slow: with a non-streaming request the
        reverse proxy in front of the model (e.g. Cloudflare quick tunnels)
        can hit its time-to-first-byte limit (HTTP 524) before the model has
        emitted anything. With stream=True the first token opens the response
        quickly and the connection stays alive for the whole generation.

        Returns the assistant content with reasoning wrappers stripped.
        Raises EvonError on every failure mode.
        """
        if not self.configured:
            raise EvonError(
                "Evon is not configured. Set EVON_API_URL, EVON_API_KEY and EVON_MODEL."
            )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        started = time.monotonic()
        parts: list[str] = []
        finish_reason: str | None = None
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self.timeout, connect=15.0)) as client:
                async with client.stream(
                    "POST",
                    str(self.api_url),
                    json=payload,
                    headers=self._headers(),
                ) as response:
                    if response.status_code != 200:
                        latency = round((time.monotonic() - started) * 1000)
                        # Log status + latency without leaking the API key or content
                        print(f"[evon] HTTP {response.status_code} in {latency}ms", flush=True)
                        raise EvonError(f"Evon returned HTTP {response.status_code}")

                    first_token_ms = None
                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[len("data:"):].strip()
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                        except ValueError:
                            # Ignore keep-alive / malformed fragments
                            continue
                        choices = chunk.get("choices") or []
                        if not choices:
                            continue
                        if first_token_ms is None:
                            first_token_ms = round((time.monotonic() - started) * 1000)
                        choice = choices[0]
                        delta = choice.get("delta") or {}
                        piece = delta.get("content") or choice.get("text") or ""
                        if piece:
                            parts.append(piece)
                        if choice.get("finish_reason"):
                            finish_reason = choice.get("finish_reason")
        except httpx.TimeoutException as exc:
            got = "".join(parts).strip()
            if got:
                # Partial stream: only fail when the JSON below cannot parse.
                print("[evon] stream timed out after partial content", flush=True)
            else:
                raise EvonError(f"Evon request timed out after {self.timeout}s") from exc
        except httpx.HTTPError as exc:
            raise EvonError(f"Evon request failed: {type(exc).__name__}") from exc

        latency = round((time.monotonic() - started) * 1000)
        ttfb = f" ttfb={first_token_ms}ms" if first_token_ms is not None else ""
        content = self._unwrap("".join(parts))
        if not content.strip():
            raise EvonError("Evon returned an empty completion")
        if finish_reason == "length":
            # Might still parse as JSON below; warn only.
            print("[evon] finish_reason=length (possibly incomplete generation)", flush=True)

        print(f"[evon] stream done in {latency}ms{ttfb}", flush=True)
        return content

    async def chat_json(self, system_prompt: str, user_text: str, max_tokens: int = 1600) -> dict:
        """Chat completion that must yield a JSON object. One strict retry."""
        content = await self.chat(system_prompt, user_text, max_tokens=max_tokens)
        try:
            return extract_json_object(content)
        except ValueError:
            retry_content = await self.chat(
                system_prompt + "\n\nREPEAT THE INSTRUCTIONS STRICTLY: your ENTIRE "
                "reply must be a single valid JSON object, no commentary, no "
                "markdown fences.",
                user_text,
                max_tokens=max_tokens,
            )
            try:
                return extract_json_object(retry_content)
            except ValueError as exc:
                raise EvonError("Evon response did not contain a valid JSON object") from exc


# ---------------------------------------------------------------------------
# Structured case analysis (migration spec §3)
# ---------------------------------------------------------------------------

CASE_SCHEMA_PROMPT = """Clinical intake for a livestock assistant. The farmer transcript below
is in ENGLISH. Reply ONLY with one JSON object (no commentary, no code fences):

{
 "case_summary": "<factual summary of what the farmer reported>",
 "animal_information": {"animal_type": "<animal or null>", "observations": "<age/milk notes or null>"},
 "symptoms": ["<each reported symptom, verbatim facts>"],
 "symptom_duration": "<stated duration or null>",
 "possible_causes": ["<general non-diagnostic causes>"],
 "urgency": "emergency|urgent|routine",
 "urgency_reasons": ["<why this level>"],
 "immediate_precautions": ["<safe general precautions, NO medicines/dosages/injections>"],
 "recommendations": ["<next steps, e.g. contact a vet; NEVER prescriptions>"],
 "missing_information": ["<what to ask the farmer>"],
 "follow_up_questions": ["<short questions>"],
 "is_confirmed_diagnosis": false
}

Rules: never invent information; possible_causes are possibilities, never a
diagnosis (is_confirmed_diagnosis always false); no medicine names, dosages,
injections or treatment instructions; life-threatening signs => "emergency";
unknown fields -> null or [].
"""

SAFETY_INSTRUCTION = (
    "You are not a veterinarian. You support intake, triage and referral only."
)


class EvonCaseAnalyzer:
    """Analyzes an English livestock transcript and returns the structured case."""

    id = "evon"

    def __init__(self, client: EvonClient | None = None):
        self.client = client or EvonClient()

    @property
    def configured(self) -> bool:
        return self.client.configured

    async def analyze_english_transcript(self, english_transcript: str, animal_type: str = "cow") -> dict:
        system_prompt = CASE_SCHEMA_PROMPT + "\n" + SAFETY_INSTRUCTION
        user_text = (
            f"Animal reported by farmer: {animal_type or 'unknown'}\n"
            f"English transcript:\n{english_transcript}"
        )
        result = await self.client.chat_json(system_prompt, user_text, max_tokens=1200)
        result = self._normalise(result)
        result["provider"] = self.id
        result["is_demo"] = False
        return result

    @staticmethod
    def _normalise(result: dict) -> dict:
        """Coerce Evon output into the schema the rest of JeevSetu expects."""
        if not isinstance(result, dict):
            raise EvonError("Evon analysis was not a JSON object")

        animal_info = result.get("animal_information") or {}
        if not isinstance(animal_info, dict):
            animal_info = {}

        symptoms = result.get("symptoms")
        symptoms_list = []
        if isinstance(symptoms, list):
            for s in symptoms:
                value = s.get("value") if isinstance(s, dict) else s
                if isinstance(value, str) and value.strip():
                    symptoms_list.append({
                        "value": value.strip(),
                        "source_text": (s.get("source_text") if isinstance(s, dict) else value) or "",
                        "confidence": s.get("confidence", 0.8) if isinstance(s, dict) else 0.8,
                    })

        urgency = str(result.get("urgency") or result.get("urgency_level") or "routine").lower()
        if urgency not in ("emergency", "urgent", "routine"):
            urgency = {"severe": "emergency", "critical": "emergency", "high": "urgent", "low": "routine"}.get(urgency, "routine")

        def string_list(value) -> list:
            if isinstance(value, list):
                return [str(v).strip() for v in value if str(v).strip()]
            if isinstance(value, str) and value.strip():
                return [value.strip()]
            return []

        animal = animal_info.get("animal_type") or animal_info.get("type") or result.get("animal_type")

        return {
            "case_summary": (result.get("case_summary") or result.get("summary") or "").strip(),
            "animal_type": animal or "",
            "animal_information": animal_info,
            "symptoms_reported": symptoms_list,
            "symptom_duration": result.get("symptom_duration") or "",
            "possible_causes": string_list(result.get("possible_causes") or result.get("differential_diagnosis")),
            "urgency_level": urgency,
            "urgency_reasons": string_list(result.get("urgency_reasons")),
            "immediate_precautions": string_list(result.get("immediate_precautions") or result.get("immediate_actions")),
            "recommendations": string_list(result.get("recommendations")),
            "missing_information": string_list(result.get("missing_information") or result.get("unknown_fields")),
            "follow_up_questions": string_list(result.get("follow_up_questions")),
            "is_confirmed_diagnosis": False,
        }


def get_evon_analyzer() -> EvonCaseAnalyzer:
    return EvonCaseAnalyzer()
