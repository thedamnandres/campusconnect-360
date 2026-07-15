import asyncio
import aio_pika
import json
import uuid
import logging
from datetime import datetime, timedelta
from app.config import settings
from app.database import SessionLocal
from app.models.models import OutboxEvent

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "campusconnect.events"

def enqueue_event(
    db,
    event_type: str,
    payload: dict,
    deduplication_key: str,
    correlation_id: str | None = None,
) -> OutboxEvent:
    """Agrega un evento a la misma transacción SQL del cambio de negocio."""
    existing = db.query(OutboxEvent).filter(
        OutboxEvent.deduplication_key == deduplication_key
    ).first()
    if existing:
        return existing

    event_id = str(uuid.uuid4())
    now = datetime.utcnow()
    event = {
        "eventId":       event_id,
        "eventType":     event_type,
        "occurredAt":    now.isoformat() + "Z",
        "correlationId": correlation_id or f"corr-{now.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}",
        **payload
    }
    outbox_event = OutboxEvent(
        id=event_id,
        deduplication_key=deduplication_key,
        event_type=event_type,
        event_data=event,
        status="pending",
        next_attempt_at=now,
    )
    db.add(outbox_event)
    return outbox_event


async def publish_pending_events(limit: int = 50) -> int:
    """Publica eventos pendientes con entrega al menos una vez."""
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        events = db.query(OutboxEvent).filter(
            OutboxEvent.status != "published",
            OutboxEvent.next_attempt_at <= now,
        ).order_by(OutboxEvent.created_at).limit(limit).all()
        if not events:
            return 0

        connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        async with connection:
            channel = await connection.channel()
            exchange = await channel.declare_exchange(
                EXCHANGE_NAME,
                aio_pika.ExchangeType.TOPIC,
                durable=True
            )
            for outbox_event in events:
                try:
                    event = outbox_event.event_data
                    message = aio_pika.Message(
                        body=json.dumps(event).encode(),
                        content_type="application/json",
                        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                        message_id=outbox_event.id,
                        correlation_id=event.get("correlationId"),
                    )
                    routing_key = f"campusconnect.{outbox_event.event_type.lower()}"
                    await exchange.publish(message, routing_key=routing_key)
                    outbox_event.status = "published"
                    outbox_event.attempts += 1
                    outbox_event.last_error = None
                    outbox_event.published_at = datetime.utcnow()
                    db.commit()
                    logger.info(
                        "[OUTBOX PUBLISHED] %s | id=%s | attempts=%s",
                        outbox_event.event_type,
                        outbox_event.id,
                        outbox_event.attempts,
                    )
                except Exception as exc:
                    db.rollback()
                    failed = db.query(OutboxEvent).filter(OutboxEvent.id == outbox_event.id).first()
                    if failed:
                        failed.attempts += 1
                        failed.status = "retrying"
                        failed.last_error = str(exc)[:1000]
                        failed.next_attempt_at = datetime.utcnow() + timedelta(
                            seconds=min(30, 2 ** min(failed.attempts, 5))
                        )
                        db.commit()
                    logger.error("[OUTBOX RETRY] id=%s: %s", outbox_event.id, exc)
        return len(events)
    except Exception as exc:
        db.rollback()
        logger.warning("[OUTBOX] RabbitMQ no disponible; se reintentará: %s", exc)
        return 0
    finally:
        db.close()


async def start_outbox_publisher():
    while True:
        try:
            published = await publish_pending_events()
            await asyncio.sleep(1 if published else 2)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.exception("[OUTBOX] Error inesperado: %s", exc)
            await asyncio.sleep(5)
