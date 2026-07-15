from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import DashboardCounters, ProcessedEvent

class AnalyticsRepository:

    def get_counters(self, db: Session, key: str = "GLOBAL") -> DashboardCounters:
        counters = db.query(DashboardCounters).filter(DashboardCounters.id == key).first()
        if not counters:
            counters = DashboardCounters(id=key)
            db.add(counters)
            db.commit()
            db.refresh(counters)
        return counters

    def is_event_processed(self, db: Session, event_id: str) -> bool:
        return db.query(ProcessedEvent).filter(ProcessedEvent.event_id == event_id).first() is not None

    def _increment(self, counters: DashboardCounters, event_type: str, payload: dict) -> None:
        if event_type == "StudentEnrolled":
            counters.total_students += 1
        elif event_type == "PaymentCreated":
            counters.total_payments_pending += 1
        elif event_type == "PaymentConfirmed":
            counters.total_payments_confirmed += 1
            if counters.total_payments_pending > 0:
                counters.total_payments_pending -= 1
        elif event_type == "AttendanceRecorded":
            counters.total_attendances += 1
            if payload.get("status") == "ausente":
                counters.total_absences += 1
        elif event_type == "IncidentReported":
            counters.total_incidents += 1

        counters.total_events_processed += 1
        counters.last_updated = datetime.utcnow()

    def apply_event(self, db: Session, event_id: str, event_type: str, payload: dict) -> None:
        # Cada evento actualiza el contador global Y el de su colegio (si el
        # evento trae schoolId), para poder ofrecer el dashboard filtrado.
        keys = {"GLOBAL"}
        school_id = payload.get("schoolId")
        if school_id:
            keys.add(school_id)

        for key in keys:
            counters = self.get_counters(db, key)
            self._increment(counters, event_type, payload)

        db.add(ProcessedEvent(event_id=event_id, event_type=event_type))
        db.commit()

    def update_external_counters(
        self, db: Session,
        key: str = "GLOBAL",
        payments_pending: int | None = None,
        notifications_sent: int | None = None,
        notifications_failed: int | None = None,
    ) -> DashboardCounters:
        counters = self.get_counters(db, key)
        if payments_pending is not None:
            counters.total_payments_pending = payments_pending
        if notifications_sent is not None:
            counters.total_notifications_sent = notifications_sent
        if notifications_failed is not None:
            counters.total_notifications_failed = notifications_failed
        db.commit()
        db.refresh(counters)
        return counters

analytics_repo = AnalyticsRepository()
