import aio_pika
import json
import uuid
import logging
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "campusconnect.events"

async def publish_event(event_type: str, payload: dict):
    event = {
        "eventId":       str(uuid.uuid4()),
        "eventType":     event_type,
        "occurredAt":    datetime.utcnow().isoformat() + "Z",
        "correlationId": f"corr-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6]}",
        **payload
    }

    try:
        connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
        async with connection:
            channel = await connection.channel()
            exchange = await channel.declare_exchange(
                EXCHANGE_NAME,
                aio_pika.ExchangeType.TOPIC,
                durable=True
            )
            message = aio_pika.Message(
                body=json.dumps(event).encode(),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                message_id=event["eventId"],
            )
            routing_key = f"campusconnect.{event_type.lower()}"
            await exchange.publish(message, routing_key=routing_key)
            logger.info(f"[EVENT PUBLISHED] {event_type} | id={event['eventId']}")
            return event
    except Exception as e:
        logger.error(f"[EVENT ERROR] No se pudo publicar {event_type}: {e}")
        raise