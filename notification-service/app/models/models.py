from sqlalchemy import Column, String, DateTime, Enum, Text, Integer, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime
import uuid
import enum

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class NotificationStatusEnum(str, enum.Enum):
    ENVIADA = "enviada"
    FALLIDA = "fallida"

class Notification(Base):
    __tablename__ = "notifications"

    id             = Column(String, primary_key=True, default=gen_uuid)
    student_id     = Column(String, nullable=True, index=True)
    school_id      = Column(String, nullable=True, index=True)
    type           = Column(String(50), nullable=False)
    message        = Column(Text, nullable=False)
    status         = Column(Enum(NotificationStatusEnum), default=NotificationStatusEnum.ENVIADA, nullable=False)
    trigger_event  = Column(String(100), nullable=False)
    correlation_id = Column(String(100), nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow, nullable=False)

class ProcessedEvent(Base):
    __tablename__ = "processed_events"

    event_id     = Column(String, primary_key=True)
    event_type   = Column(String(100))
    processed_at = Column(DateTime, default=datetime.utcnow)


class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id                = Column(String, primary_key=True)
    deduplication_key = Column(String(255), unique=True, nullable=False, index=True)
    event_type        = Column(String(100), nullable=False)
    event_data        = Column(JSON, nullable=False)
    status            = Column(String(20), nullable=False, default="pending", index=True)
    attempts          = Column(Integer, nullable=False, default=0)
    last_error        = Column(Text, nullable=True)
    next_attempt_at   = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at        = Column(DateTime, nullable=False, default=datetime.utcnow)
    published_at      = Column(DateTime, nullable=True)
