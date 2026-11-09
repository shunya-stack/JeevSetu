import random
from app.services.provider_base import SpeechProvider, ReasoningProvider, VoiceProvider

class DemoSpeechProvider(SpeechProvider):
    """
    Demo Speech provider with realistic Indian regional and code-mixed livestock transcripts.
    Clearly labeled as DEMO MODE in UI and responses.
    """
    SAMPLE_TRANSCRIPTS = {
        "odia": [
            "ମୋ ଗାଈ ଦୁଇ ଦିନ ହେଲା କିଛି ଖାଉନି, କେବଳ ପାଣି ଟିକେ ପିଉଛି। ବାମ ପଟ ପେଟ ଫୁଲି ଯାଇଛି ଆଉ ବସି ପଡୁଛି। କ୍ଷୀର ବି ଏକଦମ କମିଗଲାଣି।",
            "ଆମ ବଳଦଟି ଲଙ୍ଗଳ ଟାଣିବା ବେଳେ ଛୋଟଉଛି। ଡାହାଣ ଗୋଡ଼ ଖୁରା ପାଖ ଫୁଲି ଯାଇଛି ଆଉ ତାତିଛି।",
           "ଛେଳିଟି ଗତକାଲିଠାରୁ ବହୁତ ଜୋରରେ ଥରୁଛି, କାନ ଥଣ୍ଡା ପଡ଼ିଯାଇଛି ଆଉ ଆଖିରୁ ପାଣି ବହୁଛି।"
        ],
        "hindi": [
            "हमारी गाय पिछले दो दिनों से चारा नहीं खा रही है। उसका पेट बायीं तरफ से बहुत फूला हुआ है और बार-बार लेट जाती है।",
            "भैंस के पिछले पैर में चोट लगी है, खुर के पास सूजन है और लंगड़ा कर चल रही है। दूध देना भी आधा कर दिया है।",
            "बकरी को कल रात से बहुत तेज बुखार है, पूरा बदन कांप रहा है और आंख-नाक से पानी गिर रहा है।"
        ],
        "english": [
            "My cow has not eaten anything for two days. It lies down all the time and the left side of its stomach is swollen. Milk production has gone down.",
            "Our buffalo injured its back leg; there is swelling near the hoof and it limps while walking. Milk yield has halved.",
            "The goat has had a very high fever since last night, its whole body is shivering and there is watering from its eyes and nose."
        ],
        "mixed": [
            "ଗାଈ completely feed ନେଉନି from yesterday. Left side stomach ଫୁଲିଛି, heavily panting କରୁଛି। Please help urgently.",
            "Cow not eating food since 2 days, gait unsteadiness ଅଛି ଆଉ body temperature ବହୁତ high ଲାଗୁଛି।"
        ]
    }

    async def transcribe(self, audio_bytes: bytes, filename: str, language_hint: str = "odia") -> dict:
        lang = language_hint if language_hint in ("odia", "hindi", "english") else "mixed"
        samples = self.SAMPLE_TRANSCRIPTS.get(lang) or self.SAMPLE_TRANSCRIPTS["mixed"]
        transcript = random.choice(samples)
        
        return {
            "transcript": transcript,
            "detected_language": lang,
            "requested_app_language": language_hint,
            "confidence": 0.94,
            "provider": "demo_speech",
            "is_demo": True,
            "note": "DEMO MODE — Sample speech recognition without live API credentials."
        }

class DemoReasoningProvider(ReasoningProvider):
    """
    Demo reasoning provider extracting structured clinical observations from text.
    """
    async def extract_case(self, transcript: str, animal_context: dict) -> dict:
        text = transcript.lower()
        symptoms = []
        duration = "Not provided"
        eating_change = "Not provided"
        milk_change = "Not provided"
        unknowns = []

        if "ଖାଉନି" in text or "नहीं खा" in text or "not eating" in text or "चारा" in text:
            symptoms.append({
                "value": "Anorexia / reduced feed intake",
                "source_text": "not eating / ଖାଉନି",
                "confidence": 0.95,
                "confirmed_by_farmer": True
            })
            eating_change = "Severe loss of appetite / off feed"

        if "ପେଟ ଫୁଲି" in text or "फूला" in text or "bloat" in text or "stomach" in text:
            symptoms.append({
                "value": "Abdominal distension / Suspected bloat",
                "source_text": "swollen stomach / ପେଟ ଫୁଲିଛି",
                "confidence": 0.98,
                "confirmed_by_farmer": True
            })

        if "ଛୋଟଉଛି" in text or "लंगड़ा" in text or "limping" in text or "ଗୋଡ଼" in text:
            symptoms.append({
                "value": "Lameness / leg injury",
                "source_text": "limping / ଛୋଟଉଛି",
                "confidence": 0.92,
                "confirmed_by_farmer": True
            })

        if "ଜ୍ୱର" in text or "बुखार" in text or "fever" in text or "temperature" in text or "ଥରୁଛି" in text:
            symptoms.append({
                "value": "Fever / Shivering",
                "source_text": "fever / ଥରୁଛି",
                "confidence": 0.96,
                "confirmed_by_farmer": True
            })

        if "ଦୁଇ ଦିନ" in text or "दो दिन" in text or "2 days" in text:
            duration = "2 days"
        elif "ଗତକାଲି" in text or "कल" in text or "yesterday" in text:
            duration = "1 day (since yesterday)"
        else:
            unknowns.append("symptom_duration")

        if "କ୍ଷୀର" in text or "दूध" in text or "milk" in text:
            milk_change = "Marked reduction in milk yield"
        else:
            unknowns.append("milk_production_change")

        if not symptoms:
            symptoms.append({
                "value": "General lethargy or unclassified malaise",
                "source_text": transcript[:60],
                "confidence": 0.85,
                "confirmed_by_farmer": False
            })

        return {
            "animal_type": animal_context.get("animal_type", "cow"),
            "language": animal_context.get("language", "odia"),
            "symptoms_reported": symptoms,
            "symptom_duration": duration,
            "eating_or_drinking_change": eating_change,
            "milk_production_change": milk_change,
            "other_observations": [f"Voice report submitted via {animal_context.get('input_mode', 'voice')}"],
            "unknown_fields": unknowns,
            "requires_human_review": True,
            "provider": "demo_reasoning",
            "is_demo": True,
            "note": "DEMO MODE — Extracted using deterministic rule parser."
        }

class DemoVoiceProvider(VoiceProvider):
    async def synthesize(self, text: str, language: str = "hi-IN") -> bytes:
        # Return empty audio bytes or mock header
        return b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x40\x1f\x00\x00\x40\x1f\x00\x00\x01\x00\x08\x00data\x00\x00\x00\x00"

