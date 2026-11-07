# JeevSetu Platform Architecture

## Purpose

JeevSetu is a voice-first animal-health intake platform. It collects a farmer's description, converts it into structured case information, applies deterministic urgency rules, and sends the case to a veterinary operations console.

The platform is an intake and escalation system. It is not an autonomous veterinarian and must not prescribe medicines, dosages, or injections.

## Runtime Components

```text
Mobile/Desktop Browser
        |
        | React routes, local draft state, audio capture
        v
Vite Frontend (development: :5173)
        |
        | /api proxy in development
        v
FastAPI Backend (development: :8000)
        |
        +--> PostgreSQL or SQLite through SQLAlchemy
        +--> Local audio storage or future object storage
        +--> Deterministic triage engine
        +--> Gnani provider adapters
        |      +--> Prisma: speech to text
        |      +--> Evon: structured extraction
        |      +--> Timbre: optional speech synthesis
        |
        v
Veterinary Operations Console
```

## Frontend Responsibilities

- `frontend/src/App.tsx` defines public farmer routes and operator routes.
- `frontend/src/context/LanguageContext.tsx` stores the selected language and the in-progress farmer draft.
- `frontend/src/pages/report/*` implements the farmer journey: animal, voice/upload/text, processing, review, triage, location, confirmation, and success.
- `frontend/src/lib/api.ts` calls the backend REST API through `/api`.
- `frontend/src/components/layout/BottomNavigation.tsx` provides mobile navigation and the `tel:1962` helpline action.
- Vite provides development serving, hot module reload, and the development proxy to FastAPI.

Draft data is stored in browser `localStorage` for development convenience. Audio blobs use browser object URLs and are uploaded to the backend before case submission.

## Backend Responsibilities

- `backend/app/main.py` creates the FastAPI application, database tables, upload directory, and demo seed data during startup.
- `backend/app/api/routes.py` exposes health, integration status, transcription, extraction, triage, case, assignment, veterinary directory, analytics, and audio endpoints.
- `backend/app/models/case.py` defines cases, status history, veterinary services, and assignments.
- `backend/app/schemas/case.py` defines request and response contracts.
- `backend/app/services/triage` applies deterministic keyword rules and returns urgency plus human-review guidance.
- `backend/app/services/gnani` provides provider interfaces, live Gnani adapters, and explicitly separate demo adapters.
- `backend/app/core/database.py` creates the async SQLAlchemy engine and sessions.

In live mode, provider failures return an API error. They must not be presented as real AI output or silently replaced with demo content.

## Data Flow

1. The farmer selects an animal and language.
2. The browser records audio, accepts an upload, or accepts typed text.
3. Audio is sent to `POST /api/audio/transcribe`.
4. Prisma returns a transcript in live mode, or the explicit demo provider is used only when `AI_PROVIDER_MODE=demo`.
5. The transcript is sent to `POST /api/cases/extract` for structured observations.
6. `POST /api/cases/triage` evaluates deterministic urgency rules.
7. The farmer reviews the transcript and extracted fields.
8. `POST /api/cases` persists the case, consent values, triage result, and initial status history.
9. Operators retrieve the case, update its status, and assign a veterinary service.
10. The tracking page retrieves a case by public reference.

## Development Setup

Start the backend with automatic Python reload:

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Start the frontend with Vite hot reload:

```powershell
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

For a phone on the same Wi-Fi, open:

```text
http://<laptop-ip>:5173/
```

The root `.env` controls provider mode, database URL, Gnani models, storage, and triage version. Keep the real API key only in the ignored local `.env`; never commit it or put it in frontend code.

## Vercel Frontend Preparation

The frontend can be deployed from the `frontend/` directory on Vercel:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://api.example.com`

The API client appends `/api` to `VITE_API_BASE_URL`. When the variable is absent, local development continues to use the Vite `/api` proxy. `frontend/vercel.json` preserves client-side React routes on refresh.

The backend must be deployed separately and its production origin must be listed in the backend `CORS_ORIGINS` value alongside the Vercel frontend origin.

## Production Deployment Shape

A production deployment should use:

1. A built frontend served by a static web server or CDN.
2. A reverse proxy such as Nginx or a managed ingress.
3. FastAPI/Uvicorn workers behind the proxy.
4. PostgreSQL instead of local SQLite.
5. Object storage for audio with private, time-limited access URLs.
6. A managed secret store for the Gnani key.
7. HTTPS, restrictive CORS, authentication, role-based authorization, rate limiting, audit logging, backups, retention controls, and monitoring.
8. Database migrations instead of startup `create_all()`.
9. A separate seed/bootstrap process instead of seeding on every application startup.

## Current Deployment Gaps

- Operator authentication is currently demo-only and client-side.
- Case, transcript, contact, location, and audio endpoints need authorization before production exposure.
- CORS configuration should be environment-driven and restrictive.
- Audio upload needs quotas, validation, scanning, retention, and private access control.
- The live Gnani endpoint contracts and supported models must be verified against current official provider documentation.
- Automated frontend tests and isolated backend integration tests should be added before deployment.
