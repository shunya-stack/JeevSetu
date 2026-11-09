from __future__ import annotations

import os
from abc import ABC, abstractmethod
from pathlib import Path, PurePosixPath

import httpx

from app.core.config import settings


# Map file extensions to MIME types for correct audio playback headers.
MIME_TYPES = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
}


class AudioStorage(ABC):
    @abstractmethod
    async def upload(self, content: bytes, object_key: str, content_type: str) -> str:
        raise NotImplementedError

    @abstractmethod
    async def download(self, object_key: str) -> tuple[bytes, str]:
        raise NotImplementedError


def validate_object_key(object_key: str) -> str:
    normalized = PurePosixPath(object_key)
    if not object_key or normalized.is_absolute() or ".." in normalized.parts:
        raise ValueError("Invalid audio object key")
    return str(normalized)


def content_type_for_key(object_key: str, fallback: str = "application/octet-stream") -> str:
    """Determine MIME type from file extension."""
    ext = PurePosixPath(object_key).suffix.lower()
    return MIME_TYPES.get(ext, fallback)


class LocalAudioStorage(AudioStorage):
    async def upload(self, content: bytes, object_key: str, content_type: str) -> str:
        safe_key = validate_object_key(object_key)
        path = Path(settings.AUDIO_STORAGE_PATH) / safe_key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return safe_key

    async def download(self, object_key: str) -> tuple[bytes, str]:
        safe_key = validate_object_key(object_key)
        path = Path(settings.AUDIO_STORAGE_PATH) / safe_key
        if not path.exists():
            raise FileNotFoundError(safe_key)
        return path.read_bytes(), content_type_for_key(safe_key)


class SupabaseAudioStorage(AudioStorage):
    def __init__(self) -> None:
        storage_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_PUBLISHABLE_KEY
        if not settings.SUPABASE_URL or not storage_key:
            raise RuntimeError("Supabase storage credentials are not configured")
        self.base_url = settings.SUPABASE_URL.rstrip("/")
        self.bucket = settings.SUPABASE_BUCKET
        self.headers = {
            "Authorization": f"Bearer {storage_key}",
            "apikey": storage_key,
        }

    def object_url(self, object_key: str) -> str:
        safe_key = validate_object_key(object_key)
        return f"{self.base_url}/storage/v1/object/{self.bucket}/{safe_key}"

    async def upload(self, content: bytes, object_key: str, content_type: str) -> str:
        safe_key = validate_object_key(object_key)
        headers = {
            **self.headers,
            "Content-Type": content_type or "application/octet-stream",
            "x-upsert": "false",
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.object_url(safe_key), headers=headers, content=content)
            response.raise_for_status()
        return safe_key

    async def download(self, object_key: str) -> tuple[bytes, str]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.object_url(object_key), headers=self.headers)
            response.raise_for_status()
        return response.content, response.headers.get("content-type", "application/octet-stream")


def get_audio_storage() -> AudioStorage:
    if settings.AUDIO_STORAGE_MODE == "supabase":
        return SupabaseAudioStorage()
    return LocalAudioStorage()
