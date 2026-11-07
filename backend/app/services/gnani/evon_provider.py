import httpx
from app.services.gnani.base import ReasoningProvider

class GnaniEvonProvider(ReasoningProvider):
    """
    Gnani Evon v3.3 reasoning adapter for structured symptom extraction.
    Sends prompt to Gnani's managed LLM / Plexus API endpoint.
    """
    def __init__(self, api_key: str, base_url: str = "https://api.vachana.ai", model: str = "gnani-evon-v3.3-30B-A3B"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def extract_case(self, transcript: str, animal_context: dict) -> dict:
        url = f"{self.base_url}/api/v1/chat/completions"
        headers = {
            "X-API-Key-ID": self.api_key,
            "Content-Type": "application/json"
        }
        
        system_prompt = (
            "You are the clinical intake parser for JeevSetu animal health assistant. "
            "Extract reported symptoms into valid JSON strictly following this schema: "
            "animal_type, language, symptoms_reported (list of {value, source_text, confidence}), "
            "symptom_duration, eating_or_drinking_change, milk_production_change, other_observations, unknown_fields. "
            "DO NOT INVENT symptoms. DO NOT prescribe medicines or dosages."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Animal: {animal_context.get('animal_type', 'cow')}\nTranscript: {transcript}"}
            ],
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            res = response.json()
            content = res["choices"][0]["message"]["content"]
            import json
            parsed = json.loads(content)
            parsed["provider"] = "gnani_evon"
            parsed["is_demo"] = False
            return parsed

