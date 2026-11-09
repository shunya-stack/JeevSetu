"""
Database seed module for JeevSetu.

Production readiness: no sample/demo data is inserted by default.
The database starts empty — veterinary services and cases are created
through the operator console and farmer intake flow respectively.
Only tables are created on startup.
"""

import asyncio
from app.core.database import engine, Base


async def seed_data():
    """Create database tables only. No sample/demo data is seeded."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables ensured (no demo data seeded).")


if __name__ == "__main__":
    asyncio.run(seed_data())
