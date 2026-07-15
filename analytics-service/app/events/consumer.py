import asyncio
import logging
import aio_pika

from app.config import settings
from app.database import SessionLocal
from app.repositories.analytics_repository import analytics_repo
from app.events.resilience import decode_and_validate_event, retry_or_dead_letter

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "campusconnect.events"
QUEUE_NAME = "q.analytics"
DLX_EXCHANGE_NAME = "campusconnect.dlx"
DLQ_QUEUE_NAME = f"{QUEUE_NAME}.dlq"

async def process_message(message, channel, dlx_exchange):
    async with message.process(requeue=True, ignore_processed=True):
        try:
            data = decode_and_validate_event(message.body)
        except Exception as parse_err:
            logger.error(f"[CONSUMER] Error al procesar JSON del mensaje: {parse_err}")
            await retry_or_dead_letter(
                channel, dlx_exchange, message, QUEUE_NAME, parse_err, terminal=True
            )
            return

        event_id = data["eventId"]
        event_type = data.get("eventType", "Unknown")

        db = SessionLocal()
        try:
            if analytics_repo.is_event_processed(db, event_id):
                logger.info(f"[CONSUMER] Evento {event_id} ya fue procesado. Omitiendo (idempotencia).")
                return

            analytics_repo.apply_event(db, event_id, event_type, data)
            logger.info(f"[CONSUMER] Contadores actualizados por evento {event_type} (id={event_id})")
        except Exception as e:
            db.rollback()
            logger.error(f"[CONSUMER ERROR] Fallo al procesar evento {event_id}: {e}")
            await retry_or_dead_letter(channel, dlx_exchange, message, QUEUE_NAME, e)
        finally:
            db.close()

async def start_consumer():
    while True:
        try:
            logger.info("[CONSUMER] Conectando a RabbitMQ...")
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=10)

                exchange = await channel.declare_exchange(
                    EXCHANGE_NAME,
                    aio_pika.ExchangeType.TOPIC,
                    durable=True
                )
                dlx_exchange = await channel.declare_exchange(
                    DLX_EXCHANGE_NAME,
                    aio_pika.ExchangeType.DIRECT,
                    durable=True,
                )
                dlq_queue = await channel.declare_queue(DLQ_QUEUE_NAME, durable=True)
                await dlq_queue.bind(dlx_exchange, routing_key=DLQ_QUEUE_NAME)
                queue = await channel.declare_queue(QUEUE_NAME, durable=True)
                await queue.bind(exchange, routing_key="#")

                logger.info(f"[CONSUMER] Escuchando todos los eventos en la cola '{QUEUE_NAME}' (routing key '#')...")

                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        await process_message(message, channel, dlx_exchange)

        except asyncio.CancelledError:
            logger.info("[CONSUMER] Tarea de consumidor cancelada.")
            break
        except Exception as e:
            logger.error(f"[CONSUMER] Error de conexión en el consumidor: {e}. Reintentando en 5 segundos...")
            await asyncio.sleep(5)
