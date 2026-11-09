"""
Bhashini service — ASR (speech-to-text), translation and TTS for JeevSetu.

Implements the official published Bhashini/ULCA request schema:

  ASR:     {"pipelineTasks":[{"taskType":"asr","config":{"language":{...},"audioFormat":...}}],
            "audioData":[{"audioContent":"<base64>"}]}
  NMT:     {"pipelineTasks":[{"taskType":"translation","config":{"language":{...}}}],
            "inputData":{"input":[{"source":"<text>"}]}}
  TTS:     {"pipelineTasks":[{"taskType":"tts","config":{"language":{...},"gender":...}}],
            "inputData":{"input":[{"source":"<text>"}]}}

Responses follow the standard shape:
  {"pipelineResponse":[{"output":[{"target<source":...}]}], ...}

Endpoints come from configuration ONLY (BHASHINI_ASR_URL /
BHASHINI_TRANSLATION_URL). No endpoint is hard-coded: obtain the compute
URLs for your account from the Bhashini portal / pipeline discovery API and
set them as environment variables. If the account supplies a pipeline id
for a service, set BHASHINI_*_PIPELINE_ID and it is attached to the request.

In-memory translation caching prevents duplicate Bhashini calls for the same
(source, target, text) triple — required for language switching without
re-running analysis.
"""

import base64
import hashlib
import os
import time
from collections import OrderedDict
from typing import List, Optional

import httpx

from app.core.config import settings


class BhashiniError(Exception):
    """Raised when a Bhashini call fails, is misconfigured or malformed."""


# App language names -> Bhashini language codes
APP_TO_BHASHINI = {
    "odia": "or",
    "hindi": "hi",
    "english": "en",
}
BHASHINI_TO_APP = {v: k for k, v in APP_TO_BHASHINI.items()}


def bhashini_lang(app_language: str) -> str:
    code = APP_TO_BHASHINI.get((app_language or "").lower())
    if not code:
        raise BhashiniError(f"Unsupported app language '{app_language}' for Bhashini")
    return code


def app_lang(bhashini_code: Optional[str]) -> str:
    if not bhashini_code:
        return ""
    return BHASHINI_TO_APP.get(bhashini_code.lower(), bhashini_code)


class _TranslationCache:
    """Small LRU cache keyed by (source, target, sha256(text))."""

    def __init__(self, max_entries: int = 2000):
        self._max = max_entries
        self._store: OrderedDict = OrderedDict()

    @staticmethod
    def _key(source: str, target: str, text: str) -> str:
        return f"{source}>{target}:{hashlib.sha256(text.encode('utf-8')).hexdigest()}"

    def get(self, source: str, target: str, text: str) -> Optional[str]:
        key = self._key(source, target, text)
        hit = self._store.get(key)
        if hit is not None:
            self._store.move_to_end(key)
        return hit

    def put(self, source: str, target: str, text: str, value: str) -> None:
        key = self._key(source, target, text)
        self._store[key] = value
        self._store.move_to_end(key)
        if len(self._store) > self._max:
            self._store.popitem(last=False)


_translation_cache = _TranslationCache()


class BhashiniClient:
    """
    Client for the configured Bhashini compute endpoints.

    - ASR:      BHASHINI_ASR_URL        (+ optional BHASHINI_ASR_PIPELINE_ID)
    - NMT:      BHASHINI_TRANSLATION_URL (+ optional BHASHINI_TRANSLATION_PIPELINE_ID)
    - TTS:      BHASHINI_TTS_URL         (+ optional BHASHINI_TTS_PIPELINE_ID)

    Authentication style documented by Bhashini: the API key is sent both as
    an "authorization" header and as "ULCA-API-KEY". Every compute call also
    carries a fresh "ULCA-REQUEST-ID".
    """

    id = "bhashini"

    def __init__(self):
        self.api_key = (settings.BHASHINI_API_KEY or "").strip()
        self.asr_url = (settings.BHASHINI_ASR_URL or "").strip()
        self.translation_url = (settings.BHASHINI_TRANSLATION_URL or "").strip()
        self.tts_url = (settings.BHASHINI_TTS_URL or "").strip()

    # -- configuration -----------------------------------------------------

    @property
    def asr_configured(self) -> bool:
        return bool(self.api_key and self.asr_url)

    @property
    def translation_configured(self) -> bool:
        return bool(self.api_key and self.translation_url)

    @property
    def tts_configured(self) -> bool:
        return bool(self.api_key and self.tts_url)

    def _headers(self, request_id: str | None = None) -> dict:
        return {
            "authorization": self.api_key,
            "ULCA-API-KEY": self.api_key,
            "ULCA-REQUEST-ID": request_id or os.urandom(8).hex(),
            "Content-Type": "application/json",
        }

    # -- shared HTTP -------------------------------------------------------

    async def _post(self, url: str, payload: dict, tags: list, timeout: float) -> dict:
        """POST a ULCA pipeline request and return the raw body dict.

        Retries once on transport errors and 5xx before giving up so a single
        network hiccup does not fail the farmer flow."""
        last_error: Optional[Exception] = None
        for attempt in (1, 2):
            started = time.monotonic()
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(timeout, connect=15.0)) as client:
                    response = await client.post(url, json=payload, headers=self._headers())
            except httpx.TimeoutException as exc:
                last_error = BhashiniError(f"Bhashini request timed out after {timeout}s")
                print(f"[bhashini] {tags} timeout (attempt {attempt})", flush=True)
                continue
            except httpx.HTTPError as exc:
                last_error = BhashiniError(f"Bhashini request failed: {type(exc).__name__}")
                print(f"[bhashini] {tags} transport error {type(exc).__name__} (attempt {attempt})", flush=True)
                continue

            latency = round((time.monotonic() - started) * 1000)
            if response.status_code == 200:
                try:
                    body = response.json()
                except ValueError as exc:
                    raise BhashiniError("Bhashini response body was not valid JSON") from exc
                print(f"[bhashini] {tags} 200 in {latency}ms", flush=True)
                return body

            print(f"[bhashini] {tags} HTTP {response.status_code} in {latency}ms (attempt {attempt})", flush=True)
            if response.status_code >= 500 and attempt == 1:
                last_error = BhashiniError(f"Bhashini returned HTTP {response.status_code}")
                continue
            raise BhashiniError(f"Bhashini returned HTTP {response.status_code}")
        raise last_error or BhashiniError("Bhashini request failed")

    # -- ASR -------------------------------------------------------------

    def _extract_first_output(self, body: dict) -> dict:
        pipeline = body.get("pipelineResponse")
        if isinstance(pipeline, list) and pipeline:
            outputs = pipeline[0].get("output") or []
            if isinstance(outputs, list) and outputs:
                out = outputs[0]
                if isinstance(out, dict):
                    return out
        # Some deployments return {"output":[{"target"/"source": ...}]} directly
        direct = body.get("output")
        if isinstance(direct, list) and direct and isinstance(direct[0], dict):
            return direct[0]
        raise BhashiniError("Bhashini response contained no pipeline output")

    async def transcribe(
        self,
        audio_bytes: bytes,
        audio_format: str = "wav",
        app_language: str = "odia",
        timeout: float = 60.0,
    ) -> dict:
        """
        Speech-to-text. Returns {"transcript", "detected_language"(app name),
        "provided_language_hint"}.

        For the supported languages Akshar/Anuvaad ASR ALSO supports
        "auto" language detection via {"autoDetectConfig": ...}; when the
        farmer selected Odia/Hindi/English explicitly the poster is sent so
        quality and latency are predictable. Automatic detection is offered
        through app_language="auto".
        """
        if not self.asr_configured:
            raise BhashiniError(
                "Bhashini ASR is not configured. Set BHASHINI_API_KEY and BHASHINI_ASR_URL."
            )
        if not audio_bytes:
            raise BhashiniError("Audio payload is empty")

        audio_format = (audio_format or "wav").lower()
        format_map = {
            "wav": "wav", "x-wav": "wav", "wave": "wav",
            "mp3": "mp3", "mpeg": "mp3",
            "flac": "flac", "ogg": "flac", "opus": "flac", "webm": "wav",
                    }
        ulca_format = format_map.get(audio_format, "wav")

        task: dict = {
            "taskType": "asr",
            "config": {
                "language": {},
                "audioFormat": ulca_format,
            },
            "serviceId": settings.BHASHINI_ASR_PIPELINE_ID or None,
        }
        if app_language == "auto":
            task["config"]["autoDetectConfig"] = {"sourceLanguageConfig": {
                "or": "odia", "hi": "hindi", "en": "english"}}
        else:
            task["config"]["language"]["sourceLanguage"] = bhashini_lang(app_language)

        task = {k: v for k, v in task.items() if v not in (None, {},)}

        payload = {
            "pipelineTasks": [task],
            "audioData": [
                {
                    "audioContent": base64.b64encode(audio_bytes).decode("ascii"),
                }
            ],
        }

        body = await self._post(
            self.asr_url, payload, tags=["asr", app_language], timeout=timeout,
        )

        out = self._extract_first_output(body)
        transcript = str(out.get("source") or out.get("transcript") or "").strip()

        detected = out.get("detectedLanguage") or out.get("detected_language")
        pipeline = body.get("pipelineResponse") if isinstance(body, dict) else None
        if not detected and isinstance(pipeline, list) and pipeline and isinstance(pipeline[0], dict):
            cfg_lang = (pipeline[0].get("config") or {}).get("language") or {}
            detected = cfg_lang.get("sourceLanguage")

        if not transcript:
            raise BhashiniError("No speech recognised in the audio")

        return {
            "transcript": transcript,
            "detected_language": app_lang(detected) or app_language,
            "provided_language_hint": app_language,
        }

    # -- Translation ------------------------------------------------------

    async def translate_texts(
        self,
        texts: List[str],
        source_language: str,
        target_language: str,
        timeout: float = 45.0,
    ) -> List[str]:
        """
        Translate a list of strings in ONE batched call (numbers, units and
        short clinical fragments are preserved verbatim by the NMT service —
        the safety rules about medicines/urgency live in the content itself).

        Batches of 8 inputs per request when the list is long.
        Returns translations in the same order as `texts`.
        """
        if not self.translation_configured:
            raise BhashiniError(
                "Bhashini translation is not configured. Set BHASHINI_API_KEY and BHASHINI_TRANSLATION_URL."
            )
        src = bhashini_lang(source_language)
        tgt = bhashini_lang(target_language)

        if src == tgt:
            return list(texts)

        results: List[Optional[str]] = [None] * len(texts)
        to_translate: List[int] = []
        for i, text in enumerate(texts):
            if not text or not str(text).strip():
                results[i] = text
                continue
            cached = _translation_cache.get(src, tgt, text)
            if cached is not None:
                results[i] = cached
            else:
                to_translate.append(i)

        # Bhashini NMT accepts multiple input items in one call
        CHUNK = 8
        for chunk_start in range(0, len(to_translate), CHUNK):
            idxs = to_translate[chunk_start:chunk_start + CHUNK]
            payload = {
                "pipelineTasks": [
                    {
                        "taskType": "translation",
                        "config": {"language": {"sourceLanguage": src, "targetLanguage": tgt}},
                        "serviceId": settings.BHASHINI_TRANSLATION_PIPELINE_ID or None,
                    }
                ],
                "inputData": {
                    "input": [
                        {"source": texts[i]} for i in idxs
                    ]
                },
            }
            body = await self._post(
                self.translation_url,
                payload,
                tags=["nmt", f"{src}>{tgt}", f"{len(idxs)} items"],
                timeout=timeout,
            )

            pipeline = body.get("pipelineResponse") if isinstance(body, dict) else None
            outputs = []
            if isinstance(pipeline, list) and pipeline and isinstance(pipeline[0], dict):
                outputs = pipeline[0].get("output") or []
            if not isinstance(outputs, list):
                outputs = []

            if len(outputs) != len(idxs):
                raise BhashiniError(
                    f"Bhashini returned {len(outputs)} outputs for {len(idxs)} inputs"
                )

            for pos, i in enumerate(idxs):
                translated = ""
                if isinstance(outputs[pos], dict):
                    translated = str(
                        outputs[pos].get("target") or outputs[pos].get("postprocessed") or ""
                    ).strip()
                if not translated:
                    raise BhashiniError("Bhashini returned an empty translation")
                results[i] = translated
                _translation_cache.put(src, tgt, texts[i], translated)

        return results

    async def translate_text(
        self, text: str, source_language: str, target_language: str
    ) -> str:
        """Convenience single-string translate (uses the shared cache)."""
        return (
            await self.translate_texts([text], source_language, target_language)
        )[0]

    async def detect_language(self, text: str, timeout: float = 30.0) -> str:
        """
        Script-based language detection for the caller's convenience
        (Odia script vs Devanagari vs Latin). Zero-cost and offline so it
        never spends Bhashini quota.
        """
        odia_chars = sum(1 for ch in text if "\u0B00" <= ch <= "\u0B7F")
        deva_chars = sum(1 for ch in text if "\u0900" <= ch <= "\u097F")
        latin_chars = sum(1 for ch in text if ch.isascii() and ch.isalpha())
        best = max(odia_chars, deva_chars, latin_chars)
        if best == 0:
            return "english"
        if best == odia_chars:
            return "odia"
        if best == deva_chars:
            return "hindi"
        return "english"

    # -- TTS --------------------------------------------------------------

    async def synthesize_speech(
        self, text: str, app_language: str = "odia", gender: str = "female",
        timeout: float = 60.0,
    ) -> bytes:
        """Text-to-speech for the farmer's selected language. Returns WAV bytes."""
        if not self.tts_configured:
            raise BhashiniError(
                "Bhashini TTS is not configured. Set BHASHINI_API_KEY and BHASHINI_TTS_URL."
            )
        payload = {
            "pipelineTasks": [
                {
                    "taskType": "tts",
                    "config": {
                        "language": {"sourceLanguage": bhashini_lang(app_language)},
                        "gender": gender,
                    },
                    "serviceId": settings.BHASHINI_TTS_PIPELINE_ID or None,
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text,
                        "audioType": "audio/wav",
                    }
                ]
            },
        }
        body = await self._post(
            self.tts_url, payload, tags=["tts", app_language], timeout=timeout,
        )
        out = self._extract_first_output(body)
        audio_b64 = out.get("audioContent") or ""
        if not audio_b64:
            raise BhashiniError("Bhashini TTS returned no audio")
        try:
            return base64.b64decode(audio_b64)
        except Exception as exc:
            raise BhashiniError("Bhashini TTS audio blob was malformed") from exc


_client: Optional[BhashiniClient] = None


def get_bhashini_client() -> BhashiniClient:
    global _client
    if _client is None:
        _client = BhashiniClient()
    return _client
