from app.core.config import settings
from app.services.gnani.base import SpeechProvider, ReasoningProvider, VoiceProvider
from app.services.gnani.prisma_provider import GnaniPrismaProvider
from app.services.gnani.evon_provider import GnaniEvonProvider
from app.services.gnani.timbre_provider import GnaniTimbreProvider
from app.services.gnani.demo_providers import DemoSpeechProvider, DemoReasoningProvider, DemoVoiceProvider

def get_speech_provider() -> SpeechProvider:
    if settings.AI_PROVIDER_MODE == "live" and settings.GNANI_API_KEY:
        return GnaniPrismaProvider(
            api_key=settings.GNANI_API_KEY,
            base_url=settings.GNANI_API_BASE_URL,
            model=settings.GNANI_PRISMA_MODEL
        )
    return DemoSpeechProvider()

def get_reasoning_provider() -> ReasoningProvider:
    if settings.AI_PROVIDER_MODE == "live" and settings.GNANI_API_KEY:
        return GnaniEvonProvider(
            api_key=settings.GNANI_API_KEY,
            base_url=settings.GNANI_API_BASE_URL,
            model=settings.GNANI_EVON_MODEL
        )
    return DemoReasoningProvider()

def get_voice_provider() -> VoiceProvider:
    if settings.AI_PROVIDER_MODE == "live" and settings.GNANI_API_KEY:
        return GnaniTimbreProvider(
            api_key=settings.GNANI_API_KEY,
            base_url=settings.GNANI_API_BASE_URL,
            model=settings.GNANI_TIMBRE_MODEL
        )
    return DemoVoiceProvider()

