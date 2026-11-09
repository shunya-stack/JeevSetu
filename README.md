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
- **Homepage (`/`)**: Panorama hero reflecting Indian rural compassionate care, tricolour sunrise palette, trust strip, language toggle (`ଓଡ଼ିଆ / हिन्दी / English`).
- **Animal Selection (`/report`)**: Single-touch animal cards (Cow, Buffalo, Goat, Sheep, Other), tag/identifier, milking status.
- **Voice Capture (`/report/voice`)**: Centered microphone button, real-time waveform visualizer, elapsed timer, audio playback, file upload fallback, typed description fallback.
- **AI Processing (`/report/processing`)**: 4-step vertical progress sequence illustrating speech recognition and symptom structuring.
- **Review & Correction (`/report/review`)**: Farmer-editable transcript and structured symptom checklist.
- **Safety Triage (`/report/urgency`)**: High-contrast red-flag emergency alert and non-emergency review guidelines.
- **Location & Contact (`/report/location`)**: Odisha district/village selectors, landmark, browser GPS pin, and consent checkbox.
- **Case Confirmation (`/report/confirm` & `/case/:id/success`)**: Generated public reference (`JS-2026-XXXX`) and immediate status tracking.

### 2. Veterinary Operations Console
- **Operator Access (`/operator/login`)**: Direct demo access to review cases.
- **Dashboard Overview (`/operator`)**: Live KPI metrics from database (`New`, `Urgent`, `Under Review`, `Resolved`), incoming queue, and case incident map.
- **Incoming Case Queue (`/operator/cases`)**: Filterable by status, urgency, animal species, district, and keyword search.
- **Case Detail (`/operator/cases/:id`)**: Split-screen case review with original audio player, transcript, red-flag triggers, audit history, and vet assignment.
- **Veterinary Directory (`/operator/vets`)**: Interactive Leaflet map and directory of Block Veterinary Dispensaries and Mobile Units across Odisha.
- **Intake Reports (`/operator/reports`)**: Aggregated analytics strictly derived from stored cases.
- **System Settings (`/operator/settings`)**: Bhashini + Evon connection status and safety engine audit info.

---

## 🔐 Environment Variables (backend `/backend/.env`)

See `.env.example` for the full annotated list. All third-party credentials are server-side only — never in the frontend.

```env
# Evon v3.3 (analysis) — OpenAI-compatible chat completions, Bearer auth
EVON_API_URL=          # e.g. https://<your-host>/v1/chat/completions (configurable endpoint)
EVON_API_KEY=
EVON_MODEL=evon-v3.3
EVON_TIMEOUT=300       # Evon inference is slow; keep a generous timeout

# Bhashini (ASR / translation / TTS) — account-specific compute URLs
BHASHINI_API_KEY=
BHASHINI_ASR_URL=
BHASHINI_TRANSLATION_URL=
BHASHINI_TTS_URL=      # optional
BHASHINI_ASR_PIPELINE_ID=           # optional, only if your account requires it
BHASHINI_TRANSLATION_PIPELINE_ID=
BHASHINI_TTS_PIPELINE_ID=

# Provider mode: "live" when credentials exist, "demo" otherwise
AI_PROVIDER_MODE=demo
```

Supported languages: Odia (`or`), Hindi (`hi`), English (`en`). Bhashini compute URLs are account/pipeline-specific — copy them from your Bhashini portal; do not invent values. No temporary tunnel URLs should be committed as production endpoints.

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

Both development servers watch for source changes. Vite updates the frontend in the browser, and Uvicorn automatically restarts the backend when Python files change.

The development servers use HTTP and automatically reload source changes: Vite provides frontend HMR and Uvicorn provides backend reload. Connect desktop or mobile devices to the same Wi-Fi network and open the Vite network URL, for example `http://10.190.161.130:5173`.

Note: mobile browsers generally block microphone access on HTTP LAN addresses. Mobile microphone recording requires HTTPS or a trusted local development certificate; audio upload and typed description remain available over HTTP.

---

## 🧪 Automated Testing

Run the full end-to-end API test suite:
```bash
cd backend
venv\Scripts\python.exe tests\test_flow.py
```
Test suite covers:
- System health and integration statuses
- Deterministic red-flag emergency evaluation
- Case creation and reference generation
- Status transitions and audit log history
- Veterinary facility queries and data consistency
