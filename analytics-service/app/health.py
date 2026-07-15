import asyncio
import aio_pika
from sqlalchemy import text
from app.config import settings
from app.database import SessionLocal


async def health_snapshot() -> dict:
    dependencies = {"database": "down", "rabbitmq": "down"}
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        dependencies["database"] = "up"
    except Exception:
        db.rollback()
    finally:
        db.close()
    try:
        connection = await asyncio.wait_for(aio_pika.connect(settings.RABBITMQ_URL), timeout=2.5)
        await connection.close()
        dependencies["rabbitmq"] = "up"
    except Exception:
        pass
    healthy = all(value == "up" for value in dependencies.values())
    return {"status": "ok" if healthy else "degraded", "service": "analytics-service", "dependencies": dependencies}
