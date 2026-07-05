from sqlalchemy import Column, String, Float, DateTime, Enum
from sqlalchemy.orm import declarative_base
from datetime import datetime
import uuid
import enum

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class PaymentStatusEnum(str, enum.Enum):
    PENDIENTE  = "pendiente"
    CONFIRMADO = "confirmado"
    FALLIDO    = "fallido"

class Payment(Base):
    __tablename__ = "payments"

    id           = Column(String, primary_key=True, default=gen_uuid)
    student_id   = Column(String, nullable=False, index=True)
    student_name = Column(String(200), nullable=False)
    amount       = Column(Float, nullable=False)
    concept      = Column(String(200), nullable=False)
    status       = Column(Enum(PaymentStatusEnum), default=PaymentStatusEnum.PENDIENTE, nullable=False)
    school_id    = Column(String, default="SCH-001")
    created_at   = Column(DateTime, default=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)

class ProcessedEvent(Base):
    __tablename__ = "processed_events"

    event_id     = Column(String, primary_key=True)
    event_type   = Column(String(100))
    processed_at = Column(DateTime, default=datetime.utcnow)
