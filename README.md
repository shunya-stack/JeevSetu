# JeevSetu (ଜୀବସେତୁ)

> **"Care that reaches every life."**  
> *A voice-first livestock health intake, safety-bounded triage support, and veterinary referral platform for rural cattle rearers.*

---

## 🌟 Overview

JeevSetu empowers rural farmers in Odisha and across India to report animal health concerns in their own natural spoken language (**Odia-first**, **Hindi**, and **English**). Spoken descriptions are transcribed by **Bhashini** (ASR), translated to English, analysed by **Evon v3.3** (structured clinical intake), and every farmer-facing response is translated back through **Bhashini** into the farmer's selected language, evaluated against deterministic **veterinarian-approved triage safety rules**, and routed to a dedicated **Veterinary Operations Console** with geolocation, full audio transcripts, and referral tracking.

---

## 💡 Solution Pitch

> **JeevSetu — Care that reaches every life.**

### The Problem

Livestock is a vital source of livelihood for rural families across Odisha. However, accessing timely veterinary assistance remains difficult due to language barriers, limited digital literacy, distant veterinary facilities, and delays in professional care. Existing digital solutions often require smartphones, internet connectivity, and English literacy, leaving many farmers underserved.

### The Solution

1. **JeevSetu is an Odia-first, voice-powered livestock health and veterinary referral platform** that allows farmers to report animal health concerns simply by speaking in Odia, Hindi, or English.
2. **Using Bhashini for speech recognition and translation, Evon v3.3 for structured symptom analysis, and deterministic veterinarian-approved triage rules**, JeevSetu identifies potential risks and classifies cases as Urgent, Review, or Information Needed.
3. **Farmers receive localized summaries, possible causes, precautions, and clear action steps in their preferred language.** With location and contact details, cases are submitted to a veterinary operations console for professional follow-up.

> **Safety first:** JeevSetu does not provide confirmed diagnoses or prescribe medicines or dosages. It supports initial assessment and connects farmers with qualified veterinarians.

### Why JeevSetu Matters

- **Odia-first:** Built around the language farmers naturally speak.
- **Voice-first:** Minimal typing and no complicated forms.
- **Clinically Safe:** AI supports triage, not diagnosis or prescription.
- **Locally Connected:** Facilitates referrals to nearby veterinary services.
- **Inclusive Vision:** A future calling service could extend access to keypad-phone users.

### Our Vision

To make veterinary assistance accessible to every livestock farmer in Odisha, regardless of language, literacy, internet connectivity, or smartphone ownership.

> **Personal Inspiration:** JeevSetu is also a memorial to a stray cat we couldn't save. We lacked the knowledge to help, veterinary services were far away, and assistance could not arrive in time. This loss inspired me to build a solution so that no farmer has to face the same helplessness when an animal needs urgent care.

### Future Idea: JeevSetu Voice Helpline

Beyond the current smartphone platform, we envision an AI-powered calling agent for farmers using basic keypad phones. By dialing a dedicated number, farmers could describe their animal's condition through a natural voice conversation. The proposed system would identify urgency, provide safe veterinarian-approved initial guidance, and route cases to nearby veterinary professionals for follow-up.

> **This is a proposed future extension, not part of the current implementation.**

---

## 🛡️ Clinical Safety Boundary

- **No AI Clinical Prescriptions:** JeevSetu never generates medicine names, chemical compounds, dosage calculations, or injection advice.
- **Deterministic Red Flags:** Clinical urgency (`urgent`, `review`, `info_needed`) is evaluated solely by deterministic, explainable veterinarian-approved triage rules—never by unconstrained LLM outputs.
- **Human Veterinary Review:** Every case is submitted directly to qualified human veterinarians and field dispensaries.
- **No Confirmed Diagnosis:** AI output is clearly marked as possibility extraction, never as a confirmed veterinary diagnosis.

---

## 🚀 Live Services & Architecture

| Component | Port | Technology | Purpose |
|---|---|---|---|
| **Frontend** | `http://127.0.0.1:5173` | React 19, TypeScript, Vite 8, Tailwind CSS, Leaflet | Mobile-first farmer flow & operator console |
| **Backend API** | `http://127.0.0.1:8000` | FastAPI, Python 3.12, SQLAlchemy 2.0, SQLite | Triage engine, Bhashini + Evon adapters, REST APIs |
| **API Docs** | `http://127.0.0.1:8000/docs` | Swagger / OpenAPI | Interactive API documentation |

---

## 🗺️ Key Screens & User Journeys

### 1. Farmer Journey (Mobile-First Web Experience)

```
Recording → AI Processing → Location & Contact → Confirm Case → Success
```

- **Homepage (`/`)**: Panorama hero reflecting Indian rural compassionate care, trust strip, language toggle (`ଓଡ଼ିଆ / हिन्दी / English`).
- **Animal Selection (`/report`)**: Single-touch animal cards (Cow, Buffalo, Goat, Sheep, Other), tag/identifier, age group, milking status.
- **Voice Capture (`/report/voice`)**: Centered microphone button, real-time waveform visualizer, audio playback, file upload fallback, typed description fallback.
- **AI Processing (`/report/processing`)**: Step-by-step pipeline showing speech-to-text → English translation → Evon clinical analysis → deterministic triage → localized content generation.
- **Review & Correction (`/report/review`)**: Farmer-editable transcript, AI-extracted symptoms (clearly marked), urgency classification, numbered action steps, possible causes (not a diagnosis), follow-up questions. Full language switching with cached translations — ASR and Evon are NEVER re-run on language change.
- **Location & Contact (`/report/location`)**: Odisha district/village selectors with translated district names, landmark, browser GPS pin, farmer name/phone, consent checkbox.
- **Case Confirmation (`/report/confirm`)**: All details in the farmer's selected language including recorded audio playback, urgency badge, priority level, and translated symptoms. Submit to generate a public reference.
- **Success (`/case/:id/success`)**: Public reference ID, case status, translated next steps as numbered instructions, "Report Another Concern" and "Return Home" actions.

---

### Translation Architecture

**Fixed content (never machine-translated):** All UI labels, headings, buttons, dropdown options, badges, statuses, errors, navigation — stored in centralized dictionaries in `frontend/src/lib/translations.ts` for Odia/Hindi/English. Medical-safety sentences (`what_to_do`, `avoid`, `vet_line`, `urgency_line`) come from backend `SAFETY_FIXED` dictionary and are never altered by NMT.

**Dynamic content (Bhashini-translated):** AI-generated summaries, symptoms, recommendations, next steps, flagged reasons, status descriptions — translated individually via Bhashini NMT API. Canonical English data and internal enum values (`high`, `emergency`, etc.) remain unchanged in the backend.

**Language switching:** Updates fixed interface text via `t()` dictionary lookups. Translates all dynamic AI-generated content from cache or on-demand Bhashini calls. Never reruns ASR or Evon. Cache hits render instantly; failures show a clear retry state. Never displays mixed-language results.

---

## 💻 Quick Start & Commands

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

---

## 🌐 Multilingual Support

JeevSetu supports three languages consistently across the entire application:

| Language | Code | Default |
|---|---|---|
| Odia | `or` / `odia` | ✅ Yes |
| Hindi | `hi` / `hindi` | ✅ Yes |
| English | `en` / `english` | ✅ Yes |

---

## 🔄 Data Flow (End-to-End)
1. **Farmer speaks** in Odia/Hindi/English into the microphone (`/report/voice`)
2. **ASR**: Bhashini transcribes speech to text in the spoken language
3. **Translate to English**: Bhashini NMT translates transcript to English for clinical analysis
4. **Clinical Analysis**: Evon v3.3 extracts symptoms, duration, urgency, precautions, recommendations, causes, follow-up questions (structured JSON)
5. **Triage**: Deterministic veterinarian-approved rules assign urgency level (`urgent`/`review`/`info_needed`)
6. **Localized Content**: Bhashini translates all dynamic content into farmer's selected language; fixed safety sentences come from backend dictionary
7. **Location & Contact**: Farmer provides district, village, landmark, GPS, name, phone, consent (`/report/location`)
8. **Confirm Case**: All information displayed in farmer's language with audio playback; farmer confirms (`/report/confirm`)
9. **Success**: Public reference ID generated, status tracking, translated next steps (`/case/:id/success`)
---
