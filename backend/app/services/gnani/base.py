from abc import ABC, abstractmethod

class SpeechProvider(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, filename: str, language_hint: str = "odia") -> dict:
        """Transcribe audio bytes to text with detected language and confidence."""
        pass

class ReasoningProvider(ABC):
    @abstractmethod
    async def extract_case(self, transcript: str, animal_context: dict) -> dict:
        """Extract structured clinical symptoms from transcript and context."""
        pass

class VoiceProvider(ABC):
    @abstractmethod
    async def synthesize(self, text: str, language: str = "hi-IN") -> bytes:
        """Synthesize spoken audio from text."""
        pass

