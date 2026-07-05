import asyncio
import json
import logging
import uuid
from datetime import datetime
import aio_pika

from app.config import settings
from app.database import SessionLocal
from app.models.models import Notification, ProcessedEvent, NotificationStatusEnum

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

async def process_message(message: aio_pika.IncomingMessage, exchange: aio_pika.Exchange, dlx_exchange: aio_pika.Exchange):
    async with message.process(ignore_processed=True):
        body = message.body.decode()
        try:
            data = json.loads(body)
        except Exception as parse_err:
            logger.error(f"[CONSUMER] Error al procesar JSON del mensaje: {parse_err}")
            return

        event_id = data.get("eventId") or message.message_id or str(uuid.uuid4())
        event_type = data.get("eventType", "Unknown")
        correlation_id = data.get("correlationId", "")
        student_id = data.get("studentId") or data.get("student_id")

        headers = dict(message.headers or {})
        retry_count = headers.get("x-retry-count", 0)

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

        except Exception as e:
            db.rollback()
            retry_count += 1
            logger.error(f"[CONSUMER ERROR] Fallo al procesar evento {event_id} (Intento {retry_count}/3): {e}")

            if retry_count < 3:
                # Reintentar re-publicando con header incrementado
                new_headers = {**headers, "x-retry-count": retry_count}
                retry_msg = aio_pika.Message(
                    body=message.body,
                    content_type=message.content_type or "application/json",
                    delivery_mode=message.delivery_mode or aio_pika.DeliveryMode.PERSISTENT,
                    message_id=message.message_id,
                    headers=new_headers
                )
                routing_key = message.routing_key or f"campusconnect.{event_type.lower()}"
                await exchange.publish(retry_msg, routing_key=routing_key)
            else:
                # Falló 3 veces -> Registrar como fallida en BD y enviar a DLQ
                logger.error(f"[CONSUMER DLQ] Evento {event_id} alcanzó el límite de 3 fallos. Redirigiendo a DLQ ({DLQ_QUEUE_NAME}).")
                try:
                    notif_type, notif_message = get_event_notification_details(event_type, data)
                    failed_notif = Notification(
                        id=str(uuid.uuid4()),
                        student_id=student_id,
                        type=notif_type or "desconocido",
                        message=notif_message or f"Falló procesamiento del evento {event_type}",
                        status=NotificationStatusEnum.FALLIDA,
                        trigger_event=event_type,
                        correlation_id=correlation_id,
                        created_at=datetime.utcnow()
                    )
                    db.add(failed_notif)
                    db.add(ProcessedEvent(event_id=event_id, event_type=event_type))
                    db.commit()
                except Exception as db_err:
                    logger.error(f"[CONSUMER DLQ DB ERROR] Error registrando notificación fallida en BD: {db_err}")
                    db.rollback()

                dlq_msg = aio_pika.Message(
                    body=message.body,
                    content_type=message.content_type or "application/json",
                    delivery_mode=message.delivery_mode or aio_pika.DeliveryMode.PERSISTENT,
                    message_id=message.message_id,
                    headers={**headers, "x-retry-count": retry_count, "x-failure-reason": str(e)}
                )
                await dlx_exchange.publish(dlq_msg, routing_key="q.notification.dlq")
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
                        await process_message(message, exchange, dlx_exchange)

        except asyncio.CancelledError:
            logger.info("[CONSUMER] Tarea de consumidor cancelada.")
            break
        except Exception as e:
            logger.error(f"[CONSUMER] Error de conexión en el consumidor: {e}. Reintentando en 5 segundos...")
            await asyncio.sleep(5)
