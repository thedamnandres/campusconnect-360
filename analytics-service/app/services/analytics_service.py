import logging
import httpx
from sqlalchemy.orm import Session
from app.config import settings
from app.models.models import DashboardCounters
from app.repositories.analytics_repository import analytics_repo

logger = logging.getLogger(__name__)

class AnalyticsService:

    async def get_dashboard(self, db: Session, token: str, school_id: str | None = None) -> DashboardCounters:
        key = school_id or "GLOBAL"
        payments_pending = None
        notifications_sent = None
        notifications_failed = None

        headers = {"Authorization": f"Bearer {token}"}

        # Los pagos pendientes y notificaciones no generan eventos propios,
        # por eso se consultan por HTTP al servicio dueño del dato. Si se
        # pide un colegio específico, se filtra el listado por school_id.
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                resp = await client.get(f"{settings.PAYMENT_SERVICE_URL}/payments/pending", headers=headers)
                resp.raise_for_status()
                payments = resp.json()
                if school_id:
                    payments = [p for p in payments if p.get("school_id") == school_id]
                payments_pending = len(payments)
            except Exception as e:
                logger.warning(f"[DASHBOARD] payment-service no disponible, se usa último valor conocido: {e}")

            try:
                resp = await client.get(f"{settings.NOTIFICATION_SERVICE_URL}/notifications", headers=headers)
                resp.raise_for_status()
                notifications = resp.json()
                if school_id:
                    notifications = [n for n in notifications if n.get("school_id") == school_id]
                notifications_sent = sum(1 for n in notifications if n.get("status") == "enviada")
                notifications_failed = sum(1 for n in notifications if n.get("status") == "fallida")
            except Exception as e:
                logger.warning(f"[DASHBOARD] notification-service no disponible, se usa último valor conocido: {e}")

        return analytics_repo.update_external_counters(
            db,
            key=key,
            payments_pending=payments_pending,
            notifications_sent=notifications_sent,
            notifications_failed=notifications_failed,
        )

analytics_service = AnalyticsService()
