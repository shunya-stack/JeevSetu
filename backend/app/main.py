import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import router as api_router
from app.seed import seed_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup tables and seed sample data
    os.makedirs(settings.AUDIO_STORAGE_PATH, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed_data()
    yield
    # Teardown
    await engine.dispose()

app = FastAPI(
    title="JeevSetu Veterinary Intake API",
    description="Voice-first animal-health intake and safety-bounded veterinary referral system.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    # Vercel generates a new *.vercel.app origin per preview deployment,
    # so allow any Vercel-hosted frontend in addition to explicit origins.
    allow_origin_regex=r"https://[a-z0-9-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/")
async def root():
    return {
        "service": "JeevSetu Veterinary Intake API",
        "documentation": "/docs",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)

