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
    
    # Gnani Configuration
    GNANI_API_KEY: str = os.getenv("GNANI_API_KEY", "")
    GNANI_API_BASE_URL: str = os.getenv("GNANI_API_BASE_URL", "https://api.vachana.ai")
    GNANI_PRISMA_MODEL: str = os.getenv("GNANI_PRISMA_MODEL", "prisma-v3.0")
    GNANI_EVON_MODEL: str = os.getenv("GNANI_EVON_MODEL", "gnani-evon-v3.3-30B-A3B")
    GNANI_TIMBRE_MODEL: str = os.getenv("GNANI_TIMBRE_MODEL", "timbre-v3.0")

    # Reasoning LLM (Google Gemini) — used for symptom extraction when configured
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

    # Reasoning LLM fallback (DeepSeek) — secondary slot for symptom extraction
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    
    # Provider Mode: "live" or "demo"
    AI_PROVIDER_MODE: str = os.getenv("AI_PROVIDER_MODE", "demo" if not os.getenv("GNANI_API_KEY") else "live")
    
    # File Storage
    AUDIO_STORAGE_MODE: str = os.getenv("AUDIO_STORAGE_MODE", "local")
    AUDIO_STORAGE_PATH: str = os.getenv("AUDIO_STORAGE_PATH", "./uploads")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_PUBLISHABLE_KEY: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_BUCKET: str = os.getenv("SUPABASE_BUCKET", "jeevsetu-audio")
    TRIAGE_RULESET_VERSION: str = "demo-v1.0"

settings = Settings()

