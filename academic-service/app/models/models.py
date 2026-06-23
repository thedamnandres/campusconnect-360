from sqlalchemy import Column, String, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import uuid
import enum

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class FinancialStatusEnum(str, enum.Enum):
    AL_DIA    = "al_dia"
    PENDIENTE = "pendiente"
    MOROSO    = "moroso"

class EnrollmentStatusEnum(str, enum.Enum):
    ACTIVA     = "activa"
    INACTIVA   = "inactiva"
    SUSPENDIDA = "suspendida"

class Student(Base):
    __tablename__ = "students"

    id                   = Column(String, primary_key=True, default=gen_uuid)
    cedula               = Column(String(10), unique=True, nullable=False, index=True)
    first_name           = Column(String(100), nullable=False)
    last_name            = Column(String(100), nullable=False)
    email                = Column(String(200), unique=True, nullable=False)
    phone                = Column(String(20))
    birth_date           = Column(String(10))
    representative_name  = Column(String(200))
    representative_email = Column(String(200))
    representative_phone = Column(String(20))
    school_id            = Column(String, default="SCH-001")
    financial_status     = Column(Enum(FinancialStatusEnum), default=FinancialStatusEnum.PENDIENTE)
    is_active            = Column(Boolean, default=True)
    created_at           = Column(DateTime, default=datetime.utcnow)
    updated_at           = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    enrollments = relationship("Enrollment", back_populates="student")

class Enrollment(Base):
    __tablename__ = "enrollments"

    id          = Column(String, primary_key=True, default=gen_uuid)
    student_id  = Column(String, ForeignKey("students.id"), nullable=False)
    grade       = Column(String(20), nullable=False)
    section = Column(String(5))
    school_year = Column(String(9), nullable=False)
    school_id   = Column(String, default="SCH-001")
    status      = Column(Enum(EnrollmentStatusEnum), default=EnrollmentStatusEnum.ACTIVA)
    notes       = Column(Text)
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = relationship("Student", back_populates="enrollments")

class ProcessedEvent(Base):
    __tablename__ = "processed_events"

    event_id     = Column(String, primary_key=True)
    event_type   = Column(String(100))
    processed_at = Column(DateTime, default=datetime.utcnow)