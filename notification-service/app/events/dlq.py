import logging

import aio_pika

from app.config import settings
from app.events.consumer import DLQ_QUEUE_NAME, MAIN_QUEUE_NAME
from app.events.resilience import decode_and_validate_event

logger = logging.getLogger(__name__)


async def get_dlq_status() -> dict:
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue(DLQ_QUEUE_NAME, passive=True)
        declaration = queue.declaration_result
        return {
            "queue": DLQ_QUEUE_NAME,
            "messages": declaration.message_count,
            "consumers": declaration.consumer_count,
        }


async def replay_dlq(limit: int = 100) -> dict:
    """Mueve eventos válidos de la DLQ a la cola principal para reprocesarlos."""
    replayed = 0
    invalid = 0
    connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        queue = await channel.declare_queue(DLQ_QUEUE_NAME, passive=True)

        for _ in range(max(1, min(limit, 500))):
            message = await queue.get(fail=False)
            if message is None:
                break
            try:
                data = decode_and_validate_event(message.body)
            except Exception as exc:
                invalid += 1
                logger.error("[DLQ REPLAY] Evento inválido conservado en DLQ: %s", exc)
                await message.reject(requeue=True)
                break

            headers = dict(message.headers or {})
            replay_message = aio_pika.Message(
                body=message.body,
                content_type=message.content_type or "application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                message_id=data["eventId"],
                correlation_id=data.get("correlationId"),
                headers={
                    "x-retry-count": 0,
                    "x-replayed-from": DLQ_QUEUE_NAME,
                    "x-original-routing-key": headers.get("x-original-routing-key", ""),
                },
            )
            try:
                await channel.default_exchange.publish(
                    replay_message,
                    routing_key=MAIN_QUEUE_NAME,
                )
                await message.ack()
                replayed += 1
            except Exception:
                await message.reject(requeue=True)
                raise

    status = await get_dlq_status()
    return {"replayed": replayed, "invalid_retained": invalid, **status}
