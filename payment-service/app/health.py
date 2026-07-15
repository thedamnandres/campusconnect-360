import asyncio
import aio_pika
from sqlalchemy import text
from app.config import settings
from app.database import SessionLocal
from app.models.models import OutboxEvent


async def health_snapshot() -> dict:
    dependencies = {"database": "down", "rabbitmq": "down"}
    pending = None
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        pending = db.query(OutboxEvent).filter(OutboxEvent.status != "published").count()
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
    return {"status": "ok" if healthy else "degraded", "service": "payment-service", "dependencies": dependencies, "outbox_pending": pending}
