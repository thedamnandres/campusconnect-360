from sqlalchemy import Column, String, DateTime, Enum, Text, Integer, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime
import uuid
import enum

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class AttendanceStatusEnum(str, enum.Enum):
    PRESENTE = "presente"
    AUSENTE  = "ausente"
    TARDANZA = "tardanza"

class IncidentTypeEnum(str, enum.Enum):
    ACADEMICO  = "academico"
    CONDUCTUAL = "conductual"
    BIENESTAR  = "bienestar"

class IncidentSeverityEnum(str, enum.Enum):
    BAJA  = "baja"
    MEDIA = "media"
    ALTA  = "alta"

class Attendance(Base):
    __tablename__ = "attendances"

    id           = Column(String, primary_key=True, default=gen_uuid)
    student_id   = Column(String, nullable=False, index=True)
    student_name = Column(String(200))
    date         = Column(String(10), nullable=False)
    status       = Column(Enum(AttendanceStatusEnum), nullable=False)
    school_id    = Column(String, default="SCH-001")
    created_at   = Column(DateTime, default=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"

    id           = Column(String, primary_key=True, default=gen_uuid)
    student_id   = Column(String, nullable=False, index=True)
    student_name = Column(String(200))
    type         = Column(Enum(IncidentTypeEnum), nullable=False)
    description  = Column(Text, nullable=False)
    severity     = Column(Enum(IncidentSeverityEnum), nullable=False)
    school_id    = Column(String, default="SCH-001")
    created_at   = Column(DateTime, default=datetime.utcnow)


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
