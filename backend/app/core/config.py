import os
from pathlib import Path

from pydantic import BaseModel

def load_local_env() -> None:
    env_path = Path(__file__).resolve().parents[3] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip().strip('"').strip("'")

load_local_env()

class Settings(BaseModel):
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./jeevsetu.db")
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:8000"
        ).split(",")
        if origin.strip()
    ]

    # ── AI pipeline: Evon v3.3 (analysis) + Bhashini (ASR / translation) ──
    # Evon — OpenAI-compatible chat completions. The endpoint is fully
    # configurable (the deployment in front of the model may change); never
    # commit a temporary tunnel URL as a production value.
    EVON_API_URL: str = os.getenv("EVON_API_URL", "")
    EVON_API_KEY: str = os.getenv("EVON_API_KEY", "")
    EVON_MODEL: str = os.getenv("EVON_MODEL", "evon-v3.3")
    # Evon runs on modest hardware (llamacpp); allow long completions.
    EVON_TIMEOUT: float = float(os.getenv("EVON_TIMEOUT", "300"))

    # Bhashini — speech recognition + translation + TTS.
    # Compute URLs are account-specific; the official portal returns them
    # during pipeline discovery. Optional pipeline/service ids are attached
    # to requests when your account requires them.
    BHASHINI_API_KEY: str = os.getenv("BHASHINI_API_KEY", "")
    BHASHINI_ASR_URL: str = os.getenv("BHASHINI_ASR_URL", "")
    BHASHINI_TRANSLATION_URL: str = os.getenv("BHASHINI_TRANSLATION_URL", "")
    BHASHINI_TTS_URL: str = os.getenv("BHASHINI_TTS_URL", "")
    BHASHINI_ASR_PIPELINE_ID: str = os.getenv("BHASHINI_ASR_PIPELINE_ID", "")
    BHASHINI_TRANSLATION_PIPELINE_ID: str = os.getenv("BHASHINI_TRANSLATION_PIPELINE_ID", "")
    BHASHINI_TTS_PIPELINE_ID: str = os.getenv("BHASHINI_TTS_PIPELINE_ID", "")

    # Provider Mode: "live" when third-party credentials exist, "demo" otherwise.
    # Demo adapters are explicitly labelled DEMO in every response.
    AI_PROVIDER_MODE: str = os.getenv(
        "AI_PROVIDER_MODE",
        "live" if (os.getenv("BHASHINI_API_KEY") and os.getenv("EVON_API_KEY")) else "demo"
    )

    # File Storage
    AUDIO_STORAGE_MODE: str = os.getenv("AUDIO_STORAGE_MODE", "local")
    AUDIO_STORAGE_PATH: str = os.getenv("AUDIO_STORAGE_PATH", "./uploads")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_PUBLISHABLE_KEY: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "jeevsetu-audio")
    TRIAGE_RULESET_VERSION: str = "demo-v1.0"

settings = Settings()
