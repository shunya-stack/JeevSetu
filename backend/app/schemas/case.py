from datetime import datetime
from pydantic import BaseModel, Field

class SymptomItem(BaseModel):
    value: str
    source_text: str | None = None
    confidence: float = 1.0
    confirmed_by_farmer: bool = True

class SymptomExtraction(BaseModel):
    animal_type: str
    animal_identifier: str | None = None
    language: str = "odia"
    symptoms_reported: list[SymptomItem] = []
    symptom_duration: str | None = None
    milk_production_change: str | None = None
    eating_or_drinking_change: str | None = None
    other_observations: list[str] = []
    unknown_fields: list[str] = []
    requires_human_review: bool = True

class TriageResult(BaseModel):
    urgency_level: str # urgent, review, info_needed
    urgency_reasons: list[str] = []
    immediate_actions: list[str] = []
    requires_vet_review: bool = True
    disclaimer: str = "This service does not provide clinical diagnosis or medication. Contact a qualified veterinary professional."

class CaseCreateRequest(BaseModel):
    animal_type: str
    animal_identifier: str | None = None
    animal_age_group: str | None = None
    is_milking: bool | None = None
    language: str = "odia"
    transcript: str | None = None
    audio_object_key: str | None = None
    audio_consent: bool = True
    symptom_extraction: dict | None = None
    urgency_level: str = "review"
    urgency_reasons: list[str] = []
    district: str | None = None
    block: str | None = None
    village: str | None = None
    landmark: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    farmer_name: str | None = None
    farmer_phone: str | None = None
    contact_consent: bool = True
    input_mode: str = "voice"
    processing_source: str = "demo"
    is_demo_record: bool = False

class CaseStatusUpdateRequest(BaseModel):
    status: str
    reason: str | None = None
    changed_by: str = "Operator"

class CaseAssignRequest(BaseModel):
    veterinary_service_id: str
    assigned_operator: str = "Operator"

class CaseStatusHistoryResponse(BaseModel):
    id: str
    previous_status: str | None
    new_status: str
    reason: str | None
    changed_by: str
    created_at: datetime

    class Config:
        from_attributes = True

class CaseResponse(BaseModel):
    id: str
    public_reference: str
    animal_type: str
    animal_identifier: str | None
    animal_age_group: str | None
    is_milking: bool | None
    language: str
    transcript: str | None
    audio_object_key: str | None
    audio_consent: bool
    symptom_extraction_json: dict | None
    urgency_level: str
    urgency_reasons_json: list | None
    district: str | None
    block: str | None
    village: str | None
    landmark: str | None
    latitude: float | None
    longitude: float | None
    farmer_name: str | None
    farmer_phone: str | None
    contact_consent: bool
    status: str
    input_mode: str
    processing_source: str
    is_demo_record: bool
    created_at: datetime
    updated_at: datetime
    status_history: list[CaseStatusHistoryResponse] = []

    class Config:
        from_attributes = True

class VeterinaryServiceResponse(BaseModel):
    id: str
    name: str
    service_type: str
    address: str
    district: str
    phone: str | None
    latitude: float
    longitude: float
    availability_status: str
    verification_status: str
    data_source: str
    is_demo_record: bool

    class Config:
        from_attributes = True

class AnalyticsSummary(BaseModel):
    total_cases: int
    new_cases: int
    urgent_cases: int
    under_review_cases: int
    resolved_cases: int
    by_animal: dict[str, int]
    by_district: dict[str, int]
    by_urgency: dict[str, int]
    by_language: dict[str, int]
    data_source_label: str = "Live application data"

