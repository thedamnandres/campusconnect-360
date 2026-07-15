import json
import logging
from typing import Any

import aio_pika

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
REQUIRED_EVENT_FIELDS = {"eventId", "eventType", "occurredAt", "correlationId"}


def decode_and_validate_event(body: bytes) -> dict[str, Any]:
    data = json.loads(body.decode())
    missing = sorted(REQUIRED_EVENT_FIELDS - set(data))
    if missing:
        raise ValueError(f"Evento sin campos obligatorios: {', '.join(missing)}")
    return data


async def retry_or_dead_letter(channel, dlx_exchange, message, queue_name: str, error: Exception, terminal: bool = False) -> str:
    headers = dict(message.headers or {})
    attempt = int(headers.get("x-retry-count", 0)) + 1
    original_routing_key = headers.get("x-original-routing-key") or message.routing_key or ""
    outgoing = aio_pika.Message(
        body=message.body,
        content_type=message.content_type or "application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
        message_id=message.message_id,
        correlation_id=message.correlation_id,
        headers={
            **headers,
            "x-retry-count": attempt,
            "x-original-routing-key": original_routing_key,
            "x-failure-reason": str(error)[:500],
        },
    )
    if not terminal and attempt < MAX_RETRIES:
        await channel.default_exchange.publish(outgoing, routing_key=queue_name)
        logger.warning("[RETRY] queue=%s attempt=%s/%s error=%s", queue_name, attempt, MAX_RETRIES, error)
        return "retried"
    await dlx_exchange.publish(outgoing, routing_key=f"{queue_name}.dlq")
    logger.error("[DLQ] queue=%s attempts=%s error=%s", queue_name, attempt, error)
    return "dead_lettered"
