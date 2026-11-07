import asyncio
from datetime import datetime, timedelta
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.case import Case, CaseStatusHistory, VeterinaryService, CaseAssignment

SAMPLE_VETS = [
    {
        "name": "State Veterinary Hospital — Saheed Nagar",
        "service_type": "Government District Hospital",
        "address": "Saheed Nagar, Bhubaneswar, Odisha 751007",
        "district": "Khordha",
        "phone": "0674-254XXXX (Sample)",
        "latitude": 20.2961,
        "longitude": 85.8245,
        "availability_status": "24x7 Emergency",
        "verification_status": "demo",
        "data_source": "Odisha Animal Resources Development (Sample)",
        "is_demo_record": True
    },
    {
        "name": "Block Veterinary Dispensary — Jatni",
        "service_type": "Block Veterinary Dispensary",
        "address": "Main Road, Jatni, Khordha 752050",
        "district": "Khordha",
        "phone": "0674-249XXXX (Sample)",
        "latitude": 20.1654,
        "longitude": 85.7082,
        "availability_status": "8 AM - 5 PM",
        "verification_status": "demo",
        "data_source": "District Directory (Sample)",
        "is_demo_record": True
    },
    {
        "name": "Cuttack Mobile Veterinary Unit (MVU-04)",
        "service_type": "Mobile Veterinary Unit",
        "address": "Kanika Chhak, Cuttack, Odisha 753008",
        "district": "Cuttack",
        "phone": "0671-230XXXX (Sample)",
        "latitude": 20.4625,
        "longitude": 85.8830,
        "availability_status": "On Field Patrol",
        "verification_status": "demo",
        "data_source": "Cuttack District Vet Office (Sample)",
        "is_demo_record": True
    },
    {
        "name": "Puri Sadar Veterinary Polyclinic",
        "service_type": "District Veterinary Polyclinic",
        "address": "Hospital Square, Grand Road, Puri 752001",
        "district": "Puri",
        "phone": "06752-22XXXX (Sample)",
        "latitude": 19.8135,
        "longitude": 85.8312,
        "availability_status": "8 AM - 8 PM",
        "verification_status": "demo",
        "data_source": "Puri ARD Office (Sample)",
        "is_demo_record": True
    },
    {
        "name": "Baripada Veterinary Dispensary",
        "service_type": "Block Veterinary Dispensary",
        "address": "Station Road, Baripada, Mayurbhanj 757001",
        "district": "Mayurbhanj",
        "phone": "06792-25XXXX (Sample)",
        "latitude": 21.9346,
        "longitude": 86.7328,
        "availability_status": "9 AM - 5 PM",
        "verification_status": "demo",
        "data_source": "Mayurbhanj District Portal (Sample)",
        "is_demo_record": True
    }
]

SAMPLE_CASES = [
    {
        "public_reference": "JS-2026-8941",
        "animal_type": "cow",
        "animal_identifier": "Gauri (Jersey Cross)",
        "animal_age_group": "Adult (4 yrs)",
        "is_milking": True,
        "language": "odia",
        "transcript": "ମୋ ଗାଈ ଦୁଇ ଦିନ ହେଲା କିଛି ଖାଉନି, କେବଳ ପାଣି ଟିକେ ପିଉଛି। ବାମ ପଟ ପେଟ ଫୁଲି ଯାଇଛି ଆଉ ବସି ପଡୁଛି। କ୍ଷୀର ବି ଏକଦମ କମିଗଲାଣି।",
        "urgency_level": "urgent",
        "urgency_reasons_json": [
            "[RED FLAG] Suspected acute rumen tympany (bloat). Pressure on diaphragm may cause respiratory failure."
        ],
        "symptom_extraction_json": {
            "animal_type": "cow",
            "symptoms_reported": [
                {"value": "Abdominal distension / Bloat", "source_text": "ବାମ ପଟ ପେଟ ଫୁଲି ଯାଇଛି", "confidence": 0.98, "confirmed_by_farmer": True},
                {"value": "Anorexia / feed refusal", "source_text": "କିଛି ଖାଉନି", "confidence": 0.95, "confirmed_by_farmer": True}
            ],
            "symptom_duration": "2 days",
            "milk_production_change": "Almost stopped",
            "eating_or_drinking_change": "Complete off feed, drinking little water",
            "unknown_fields": []
        },
        "district": "Khordha",
        "block": "Jatni",
        "village": "Kudiary",
        "landmark": "Near Gram Panchayat office",
        "latitude": 20.1702,
        "longitude": 85.7145,
        "farmer_name": "Ramesh Chandra Sahoo",
        "farmer_phone": "9437XXXXXX (Demo)",
        "status": "under_review",
        "input_mode": "voice",
        "processing_source": "demo",
        "is_demo_record": True,
        "created_at": datetime.utcnow() - timedelta(hours=3)
    },
    {
        "public_reference": "JS-2026-7214",
        "animal_type": "buffalo",
        "animal_identifier": "Murrah Buffalo #2",
        "animal_age_group": "Adult (6 yrs)",
        "is_milking": True,
        "language": "hindi",
        "transcript": "भैंस के पिछले पैर में चोट लगी है, खुर के पास सूजन है और लंगड़ा कर चल रही है। दूध देना भी आधा कर दिया है।",
        "urgency_level": "review",
        "urgency_reasons_json": [
            "[REVIEW] Locomotor issue or hoof affection.",
            "[REVIEW] Sudden or significant drop in milk yield."
        ],
        "symptom_extraction_json": {
            "animal_type": "buffalo",
            "symptoms_reported": [
                {"value": "Lameness / swollen hoof", "source_text": "खुर के पास सूजन है और लंगड़ा कर चल रही है", "confidence": 0.94, "confirmed_by_farmer": True},
                {"value": "Drop in milk yield", "source_text": "दूध देना भी आधा कर दिया है", "confidence": 0.91, "confirmed_by_farmer": True}
            ],
            "symptom_duration": "1 day",
            "milk_production_change": "Reduced by 50%",
            "eating_or_drinking_change": "Normal grazing",
            "unknown_fields": []
        },
        "district": "Cuttack",
        "block": "Baranga",
        "village": "Mundali",
        "landmark": "Opposite Primary School",
        "latitude": 20.4410,
        "longitude": 85.8320,
        "farmer_name": "Bikash Mohanty",
        "farmer_phone": "9861XXXXXX (Demo)",
        "status": "new",
        "input_mode": "voice",
        "processing_source": "demo",
        "is_demo_record": True,
        "created_at": datetime.utcnow() - timedelta(minutes=45)
    },
    {
        "public_reference": "JS-2026-5389",
        "animal_type": "goat",
        "animal_identifier": "Black Bengal Buck",
        "animal_age_group": "Young (1.5 yrs)",
        "is_milking": False,
        "language": "mixed",
        "transcript": "Goat is shivering continuously, eye watering ଅଛି and temperature appears very high.",
        "urgency_level": "urgent",
        "urgency_reasons_json": [
            "[RED FLAG] High febrile state with systemic rigors. Possible acute infectious or tick-borne disease."
        ],
        "symptom_extraction_json": {
            "animal_type": "goat",
            "symptoms_reported": [
                {"value": "High fever with shivering", "source_text": "shivering continuously, temperature very high", "confidence": 0.96, "confirmed_by_farmer": True},
                {"value": "Ocular lacrimation", "source_text": "eye watering ଅଛି", "confidence": 0.92, "confirmed_by_farmer": True}
            ],
            "symptom_duration": "Yesterday evening",
            "milk_production_change": "N/A",
            "eating_or_drinking_change": "Not taking fodder",
            "unknown_fields": []
        },
        "district": "Puri",
        "block": "Pipili",
        "village": "Dandamakundapur",
        "landmark": "Near Toll Plaza bypass",
        "latitude": 19.9850,
        "longitude": 85.8290,
        "farmer_name": "Pradeep Jena",
        "farmer_phone": "9938XXXXXX (Demo)",
        "status": "assigned",
        "input_mode": "voice",
        "processing_source": "demo",
        "is_demo_record": True,
        "created_at": datetime.utcnow() - timedelta(hours=6)
    }
]

async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        from sqlalchemy import select
        existing_vets = await session.execute(select(VeterinaryService))
        if not existing_vets.scalars().first():
            for v_data in SAMPLE_VETS:
                vet = VeterinaryService(**v_data)
                session.add(vet)

            for c_data in SAMPLE_CASES:
                case = Case(**c_data)
                session.add(case)
                await session.flush()
                # Add status history
                history = CaseStatusHistory(
                    case_id=case.id,
                    previous_status=None,
                    new_status=case.status,
                    reason="Initial intake case created",
                    changed_by="Intake System",
                    created_at=case.created_at
                )
                session.add(history)

            await session.commit()
            print("Successfully seeded demo veterinary services and cases.")
        else:
            print("Database already contains records. Skipping seed.")

if __name__ == "__main__":
    asyncio.run(seed_data())

