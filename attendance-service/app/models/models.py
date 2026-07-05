from sqlalchemy import Column, String, DateTime, Enum, Text
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
