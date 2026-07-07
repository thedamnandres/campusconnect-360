from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class DashboardCounters(Base):
    __tablename__ = "dashboard_counters"

    id                         = Column(String, primary_key=True, default="GLOBAL")
    total_students             = Column(Integer, nullable=False, default=0)
    total_payments_confirmed   = Column(Integer, nullable=False, default=0)
    total_payments_pending     = Column(Integer, nullable=False, default=0)
    total_attendances          = Column(Integer, nullable=False, default=0)
    total_absences             = Column(Integer, nullable=False, default=0)
    total_incidents            = Column(Integer, nullable=False, default=0)
    total_notifications_sent   = Column(Integer, nullable=False, default=0)
    total_notifications_failed = Column(Integer, nullable=False, default=0)
    total_events_processed     = Column(Integer, nullable=False, default=0)
    last_updated               = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ProcessedEvent(Base):
    __tablename__ = "processed_events"

    event_id     = Column(String, primary_key=True)
    event_type   = Column(String)
    processed_at = Column(DateTime, default=datetime.utcnow)
