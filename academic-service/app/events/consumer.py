import asyncio
import logging

import aio_pika

from app.config import settings
from app.database import SessionLocal
from app.models.models import FinancialStatusEnum, ProcessedEvent, Student
from app.events.resilience import decode_and_validate_event, retry_or_dead_letter

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "campusconnect.events"
QUEUE_NAME = "q.academic.payments"
DLX_EXCHANGE_NAME = "campusconnect.dlx"
DLQ_QUEUE_NAME = f"{QUEUE_NAME}.dlq"


async def process_message(
    message: aio_pika.IncomingMessage,
    channel: aio_pika.Channel,
    dlx_exchange: aio_pika.Exchange,
):
    async with message.process(requeue=True, ignore_processed=True):
        try:
            data = decode_and_validate_event(message.body)
        except Exception as parse_err:
            logger.error(f"[ACADEMIC CONSUMER] Mensaje inválido: {parse_err}")
            await retry_or_dead_letter(
                channel, dlx_exchange, message, QUEUE_NAME, parse_err, terminal=True
            )
            return

        event_id = data["eventId"]
        event_type = data.get("eventType", "Unknown")

        if event_type != "PaymentConfirmed":
            return

        db = SessionLocal()
        try:
            existing = db.query(ProcessedEvent).filter(ProcessedEvent.event_id == event_id).first()
            if existing:
                logger.info(f"[ACADEMIC CONSUMER] Evento {event_id} ya procesado. Omitiendo.")
                return

            student_id = data.get("studentId")
            student = db.query(Student).filter(Student.id == student_id).first()
            if not student:
                logger.warning(f"[ACADEMIC CONSUMER] Estudiante {student_id} no encontrado para PaymentConfirmed.")
                db.add(ProcessedEvent(event_id=event_id, event_type=event_type))
                db.commit()
                return

            student.financial_status = FinancialStatusEnum.AL_DIA
            db.add(ProcessedEvent(event_id=event_id, event_type=event_type))
            db.commit()
            logger.info(f"[ACADEMIC CONSUMER] Estado financiero actualizado para estudiante {student_id}.")
        except Exception as exc:
            db.rollback()
            logger.error(f"[ACADEMIC CONSUMER ERROR] No se pudo procesar {event_id}: {exc}")
            await retry_or_dead_letter(
                channel, dlx_exchange, message, QUEUE_NAME, exc
            )
        finally:
            db.close()


async def start_consumer():
    while True:
        try:
            logger.info("[ACADEMIC CONSUMER] Conectando a RabbitMQ...")
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=10)
                exchange = await channel.declare_exchange(
                    EXCHANGE_NAME,
                    aio_pika.ExchangeType.TOPIC,
                    durable=True,
                )
                dlx_exchange = await channel.declare_exchange(
                    DLX_EXCHANGE_NAME,
                    aio_pika.ExchangeType.DIRECT,
                    durable=True,
                )
                dlq_queue = await channel.declare_queue(DLQ_QUEUE_NAME, durable=True)
                await dlq_queue.bind(dlx_exchange, routing_key=DLQ_QUEUE_NAME)
                # La aplicación enruta explícitamente los fallos a la DLQ. Se
                # conserva la declaración original para ser compatible con
                # volúmenes RabbitMQ creados por versiones anteriores.
                queue = await channel.declare_queue(QUEUE_NAME, durable=True)
                await queue.bind(exchange, routing_key="campusconnect.paymentconfirmed")
                logger.info(f"[ACADEMIC CONSUMER] Escuchando PaymentConfirmed en {QUEUE_NAME}.")

                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        await process_message(message, channel, dlx_exchange)
        except asyncio.CancelledError:
            logger.info("[ACADEMIC CONSUMER] Tarea cancelada.")
            break
        except Exception as exc:
            logger.error(f"[ACADEMIC CONSUMER] Error de conexión: {exc}. Reintentando en 5 segundos...")
            await asyncio.sleep(5)
