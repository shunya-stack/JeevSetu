import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Float, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Case(Base):
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    public_reference: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    animal_type: Mapped[str] = mapped_column(String(32), index=True) # cow, buffalo, goat, sheep, other
    animal_identifier: Mapped[str | None] = mapped_column(String(64), nullable=True)
    animal_age_group: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_milking: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    language: Mapped[str] = mapped_column(String(32), default="odia")
    
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_object_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    audio_consent: Mapped[bool] = mapped_column(Boolean, default=True)
    
    symptom_extraction_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    urgency_level: Mapped[str] = mapped_column(String(32), default="review", index=True) # urgent, review, info_needed
    urgency_reasons_json: Mapped[list | None] = mapped_column(JSON, nullable=True)
    
    district: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    block: Mapped[str | None] = mapped_column(String(64), nullable=True)
    village: Mapped[str | None] = mapped_column(String(64), nullable=True)
    landmark: Mapped[str | None] = mapped_column(String(128), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    farmer_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    farmer_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    contact_consent: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Voice-first review & confirmation data
    original_audio_keys: Mapped[list | None] = mapped_column(JSON, nullable=True)  # all original recording keys
    original_transcripts: Mapped[list | None] = mapped_column(JSON, nullable=True)  # original-language transcripts
    english_operator_transcript: Mapped[str | None] = mapped_column(Text, nullable=True)  # English version for operators
    tts_audio_object_key: Mapped[str | None] = mapped_column(String(255), nullable=True)  # selected-language TTS audio
    farmer_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)  # explicit farmer confirmation
    confirmation_status: Mapped[str] = mapped_column(String(32), default="pending")  # pending, confirmed, rejected
    record_more_count: Mapped[int] = mapped_column(Integer, default=0)  # how many times "Record More" used
    
    status: Mapped[str] = mapped_column(String(32), default="new", index=True)
    input_mode: Mapped[str] = mapped_column(String(32), default="voice") # voice, upload, text
    processing_source: Mapped[str] = mapped_column(String(32), default="demo") # gnani_prisma, demo
    is_demo_record: Mapped[bool] = mapped_column(Boolean, default=False)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    status_history: Mapped[list["CaseStatusHistory"]] = relationship("CaseStatusHistory", back_populates="case", cascade="all, delete-orphan", order_by="desc(CaseStatusHistory.created_at)", lazy="selectin")
    assignments: Mapped[list["CaseAssignment"]] = relationship("CaseAssignment", back_populates="case", cascade="all, delete-orphan", lazy="selectin")

class CaseStatusHistory(Base):
    __tablename__ = "case_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    previous_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    new_status: Mapped[str] = mapped_column(String(32))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by: Mapped[str] = mapped_column(String(64), default="Operator")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    case: Mapped["Case"] = relationship("Case", back_populates="status_history")

class VeterinaryService(Base):
    __tablename__ = "veterinary_services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(128))
    service_type: Mapped[str] = mapped_column(String(64)) # Government Hospital, Mobile Unit, Block Vet Dispensary, Private Clinic
    address: Mapped[str] = mapped_column(String(255))
    district: Mapped[str] = mapped_column(String(64), index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    availability_status: Mapped[str] = mapped_column(String(32), default="On Duty")
    verification_status: Mapped[str] = mapped_column(String(32), default="demo")
    data_source: Mapped[str] = mapped_column(String(64), default="Demo Directory")
    is_demo_record: Mapped[bool] = mapped_column(Boolean, default=True)

class CaseAssignment(Base):
    __tablename__ = "case_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    case_id: Mapped[str] = mapped_column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    veterinary_service_id: Mapped[str] = mapped_column(String(36), ForeignKey("veterinary_services.id"), index=True)
    assigned_operator: Mapped[str] = mapped_column(String(64))
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    assignment_status: Mapped[str] = mapped_column(String(32), default="pending")

    case: Mapped["Case"] = relationship("Case", back_populates="assignments")
    veterinary_service: Mapped["VeterinaryService"] = relationship("VeterinaryService")
