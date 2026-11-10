# JeevSetu (ଜୀବସେତୁ)

> **"Care that reaches every life."**  
> *A voice-first livestock health intake, safety-bounded triage support, and veterinary referral platform for rural cattle rearers.*

---

## 🌟 Overview

JeevSetu empowers rural farmers in Odisha and across India to report animal health concerns in their own natural spoken language (**Odia-first**, **Hindi**, and **English**). Spoken descriptions are transcribed by **Bhashini** (ASR), translated to English, analysed by **Evon v3.3** (structured clinical intake), and every farmer-facing response is translated back through **Bhashini** into the farmer's selected language, evaluated against deterministic **veterinarian-approved triage safety rules**, and routed to a dedicated **Veterinary Operations Console** with geolocation, full audio transcripts, and referral tracking.

---

## 🛡️ Clinical Safety Boundary

- **No AI Clinical Prescriptions:** JeevSetu never generates medicine names, chemical compounds, dosage calculations, or injection advice.
- **Deterministic Red Flags:** Clinical urgency (`urgent`, `review`, `info_needed`) is evaluated solely by deterministic, explainable veterinarian-approved triage rules—never by unconstrained LLM outputs.
- **Human Veterinary Review:** Every case is submitted directly to qualified human veterinarians and field dispensaries.
- **No Confirmed Diagnosis:** AI output is clearly marked as possibility extraction, never as a confirmed veterinary diagnosis.

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



# Safety
TRIAGE_RULESET_VERSION=demo-v1
```

Supported languages: Odia (`or`), Hindi (`hi`), English (`en`). Bhashini compute URLs are account/pipeline-specific — copy them from your Bhashini portal; do not invent values. No temporary tunnel URLs should be committed as production endpoints. **No demo or predefined data is included** — all data comes from real farmer submissions via the voice/intake flow.

---

## 🔧 Architecture Details

### Backend Services

| File | Responsibility |
|---|---|
| `app/main.py` | FastAPI app, CORS, lifespan, route registration |
| `app/core/config.py` | Settings, `.env` loading, provider mode resolution |
| `app/core/database.py` | Async SQLAlchemy engine, session management |
| `app/api/routes.py` | All REST API endpoints (health, transcribe, translate, extract, triage, localized content, TTS, case CRUD, audio) |
| `app/services/evon_service.py` | Evon v3.3 OpenAI-compatible SSE streaming client with reasoning-wrapper stripping and structured JSON extraction |
| `app/services/bhashini_service.py` | ULCA ASR / NMT / TTS client with LRU translation cache |
| `app/services/ai_factory.py` | Provider factory — live (Evon/Bhashini) vs demo adapters |
| `app/services/provider_base.py` | Abstract provider interfaces (SpeechProvider, ReasoningProvider, VoiceProvider) |
| `app/services/demo_providers.py` | Demo adapters (return empty/zero results, clearly labelled DEMO — no sample data) |
| `app/services/language_service.py` | Script heuristics + Bhashini language routing |
| `app/services/triage/rules.py` | Deterministic veterinarian-approved triage safety engine |
| `app/services/storage.py` | Local audio file storage |
| `app/seed.py` | Database table creation only (no sample/demo data seeded) |

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | System health check |
| `GET` | `/api/integrations/status` | Provider configuration status (Evon, Bhashini, database) |
| `POST` | `/api/audio/transcribe` | Speech-to-text via Bhashini ASR (or demo passthrough) |
| `POST` | `/api/cases/enforce-language` | Language enforcement for typed text |
| `POST` | `/api/cases/translate-to-english` | Transcript translation to English via Bhashini NMT |
| `POST` | `/api/cases/extract-symptoms` | Clinical symptom extraction via Evon v3.3 |
| `POST` | `/api/cases/triage` | Deterministic urgency triage |
| `POST` | `/api/cases/generate-localized-content` | Structured translation into farmer's language (summary, symptoms, steps, precautions, causes, follow-ups, fixed safety text) |
| `POST` | `/api/cases/extract` | Alternative symptom extraction endpoint |
| `POST` | `/api/cases/append-recording` | Append additional audio to existing case |
| `POST` | `/api/cases/confirm` | Case confirmation by operator |
| `POST` | `/api/cases` | Create a new case |
| `GET` | `/api/cases` | List cases with filters |
| `GET` | `/api/cases/{id}` | Get case detail |
| `PATCH` | `/api/cases/{id}/status` | Update case status |
| `POST` | `/api/cases/{id}/assign` | Assign case to vet |
| `POST` | `/api/tts/generate` | Text-to-speech via Bhashini TTS |
| `GET` | `/api/veterinary-services` | List veterinary facilities |
| `GET` | `/api/analytics/summary` | Case analytics |
| `GET` | `/api/audio/{filename}` | Serve recorded audio file |

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
| Hindi | `hi` / `hindi` | No |
| English | `en` / `english` | No |
---

## 🗂️ Project Structure

```
JeevSetu/
├── README.md
├── .env                          # Backend environment variables (gitignored)
├── .env.example                  # Backend environment template
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app entry
│   │   ├── core/
│   │   │   ├── config.py         # Settings & .env loading
│   │   │   └── database.py       # Async SQLAlchemy setup
│   │   ├── api/
│   │   │   └── routes.py         # All REST API endpoints
│   │   ├── models/
│   │   │   └── case.py           # SQLAlchemy models
│   │   ├── schemas/
│   │   │   └── case.py           # Pydantic schemas
│   │   ├── services/
│   │   │   ├── evon_service.py       # Evon v3.3 SSE streaming client
│   │   │   ├── bhashini_service.py   # ULCA ASR/NMT/TTS + cache
│   │   │   ├── ai_factory.py         # Provider factory
│   │   │   ├── provider_base.py      # Abstract provider interfaces
│   │   │   ├── demo_providers.py     # Demo adapters (no sample data)
│   │   │   ├── language_service.py   # Script heuristics + Bhashini
│   │   │   ├── storage.py            # Local audio storage
│   │   │   └── triage/               # Deterministic triage rules
│   │   └── seed.py                   # Table creation only (no data)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Routes & layout
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── App.css
│   │   ├── lib/
│   │   │   ├── translations.ts   # Centralized i18n dictionaries (Odia/Hindi/English)
│   │   │   ├── api.ts            # API client functions
│   │   │   └── wav.ts            # WAV conversion utilities
│   │   ├── context/
│   │   │   └── LanguageContext.tsx   # Global language + draft state
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript type definitions
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Navbar.tsx        # Header with language switcher
│   │   │   │   ├── BottomNavigation.tsx  # Mobile bottom nav
│   │   │   │   └── Footer.tsx
│   │   │   ├── voice/              # Voice recording components
│   │   │   └── maps/               # Leaflet map components
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── TrackCasePage.tsx     # Case tracking (translated)
│   │   │   ├── report/
│   │   │   │   ├── ReportAnimalPage.tsx
│   │   │   │   ├── ReportVoicePage.tsx
│   │   │   │   ├── ReportProcessingPage.tsx
│   │   │   │   ├── ReportConfirmationPage.tsx
│   │   │   │   ├── ReportConfirmPage.tsx   # Confirm case (translated + audio playback)
│   │   │   │   ├── ReportLocationPage.tsx  # Location & contact (translated)
│   │   │   │   ├── CaseSuccessPage.tsx   # Success page (translated + next steps)
│   │   │   │   └── ReportReviewPage.tsx
│   │   │   └── operator/
│   │   │       ├── OperatorLoginPage.tsx   # No demo data references
│   │   │       ├── DashboardOverviewPage.tsx
│   │   │       ├── CaseQueuePage.tsx
│   │   │       ├── CaseDetailPage.tsx    # No DEMO RECORD badge
│   │   │       ├── VetDirectoryPage.tsx  # No SAMPLE DIRECTORY notice
│   │   │       ├── ReportsPage.tsx
│   │   │       └── SettingsPage.tsx
│   └── package.json
└── uploads/                      # Local audio storage directory
```

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

## 📄 License

Internal project — JeevSetu Veterinary Intake Platform.