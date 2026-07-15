import asyncio
import logging
import uuid
from datetime import datetime
import aio_pika

from app.config import settings
from app.database import SessionLocal
from app.models.models import Notification, ProcessedEvent, NotificationStatusEnum
from app.events.resilience import decode_and_validate_event, retry_or_dead_letter

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "campusconnect.events"
DLX_EXCHANGE_NAME = "campusconnect.dlx"
MAIN_QUEUE_NAME = "q.notification"
DLQ_QUEUE_NAME = "q.notification.dlq"

def get_event_notification_details(event_type: str, payload: dict):
    """
    Devuelve (notif_type, notif_message) según el tipo de evento y payload.
    """
    if event_type == "StudentEnrolled":
        return "bienvenida", "Bienvenida al representante"
    elif event_type == "PaymentConfirmed":
        return "pago", "Confirmación de pago al representante"
    elif event_type == "AttendanceRecorded":
        if payload.get("status") == "ausente":
            return "ausencia", "Alerta de ausencia al representante"
        return None, None
    elif event_type == "IncidentReported":
        return "incidente", "Alerta de incidente al representante"
    return None, None

async def process_message(
    message: aio_pika.IncomingMessage,
    channel: aio_pika.Channel,
    dlx_exchange: aio_pika.Exchange,
):
    async with message.process(requeue=True, ignore_processed=True):
        try:
            data = decode_and_validate_event(message.body)
        except Exception as parse_err:
            logger.error(f"[CONSUMER] Evento inválido: {parse_err}")
            await retry_or_dead_letter(
                channel,
                dlx_exchange,
                message,
                MAIN_QUEUE_NAME,
                parse_err,
                terminal=True,
            )
            return

        event_id = data["eventId"]
        event_type = data.get("eventType", "Unknown")
        correlation_id = data.get("correlationId", "")
        student_id = data.get("studentId") or data.get("student_id")
        school_id = data.get("schoolId") or data.get("school_id")

        db = SessionLocal()
        try:
            # 1. Idempotencia: Verificar si ya fue procesado
            existing_event = db.query(ProcessedEvent).filter(ProcessedEvent.event_id == event_id).first()
            if existing_event:
                logger.info(f"[CONSUMER] Evento {event_id} ya fue procesado previa e idénticamente. Omitiendo.")
                return

            notif_type, notif_message = get_event_notification_details(event_type, data)
            if notif_type and notif_message:
                notification = Notification(
                    id=str(uuid.uuid4()),
                    student_id=student_id,
                    school_id=school_id,
                    type=notif_type,
                    message=notif_message,
                    status=NotificationStatusEnum.ENVIADA,
                    trigger_event=event_type,
                    correlation_id=correlation_id,
                    created_at=datetime.utcnow()
                )
                db.add(notification)
                logger.info(f"[CONSUMER] Notificación '{notif_type}' generada para evento {event_type} (Estudiante: {student_id})")

            # Registrar evento procesado
            processed = ProcessedEvent(event_id=event_id, event_type=event_type)
            db.add(processed)
            db.commit()

        except Exception as exc:
            db.rollback()
            logger.error(f"[CONSUMER ERROR] Fallo al procesar evento {event_id}: {exc}")
            action = await retry_or_dead_letter(
                channel, dlx_exchange, message, MAIN_QUEUE_NAME, exc
            )

            if action == "dead_lettered":
                # Este registro es evidencia funcional. Si la propia base está
                # caída, la copia durable del mensaje permanece en RabbitMQ.
                try:
                    notif_type, notif_message = get_event_notification_details(event_type, data)
                    failed_notif = Notification(
                        id=str(uuid.uuid4()),
                        student_id=student_id,
                        school_id=school_id,
                        type=notif_type or "desconocido",
                        message=notif_message or f"Falló procesamiento del evento {event_type}",
                        status=NotificationStatusEnum.FALLIDA,
                        trigger_event=event_type,
                        correlation_id=correlation_id,
                        created_at=datetime.utcnow()
                    )
                    db.add(failed_notif)
                    db.commit()
                except Exception as db_err:
                    logger.error(f"[CONSUMER DLQ DB ERROR] Error registrando notificación fallida en BD: {db_err}")
                    db.rollback()
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

                # Declarar exchange principal
                exchange = await channel.declare_exchange(
                    EXCHANGE_NAME,
                    aio_pika.ExchangeType.TOPIC,
                    durable=True
                )

                # Declarar Dead Letter Exchange y Cola DLQ
                dlx_exchange = await channel.declare_exchange(
                    DLX_EXCHANGE_NAME,
                    aio_pika.ExchangeType.DIRECT,
                    durable=True
                )

                dlq_queue = await channel.declare_queue(DLQ_QUEUE_NAME, durable=True)
                await dlq_queue.bind(dlx_exchange, routing_key="q.notification.dlq")

                # Declarar Cola Principal configurada con DLX
                queue = await channel.declare_queue(
                    MAIN_QUEUE_NAME,
                    durable=True,
                    arguments={
                        "x-dead-letter-exchange": DLX_EXCHANGE_NAME,
                        "x-dead-letter-routing-key": "q.notification.dlq"
                    }
                )
                await queue.bind(exchange, routing_key="#")

                logger.info(f"[CONSUMER] Escuchando todos los eventos en la cola '{MAIN_QUEUE_NAME}' (routing key '#')...")

                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        await process_message(message, channel, dlx_exchange)

        except asyncio.CancelledError:
            logger.info("[CONSUMER] Tarea de consumidor cancelada.")
            break
        except Exception as e:
            logger.error(f"[CONSUMER] Error de conexión en el consumidor: {e}. Reintentando en 5 segundos...")
            await asyncio.sleep(5)
