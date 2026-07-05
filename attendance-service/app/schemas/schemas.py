from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.models import AttendanceStatusEnum, IncidentTypeEnum, IncidentSeverityEnum

# ASISTENCIA

class AttendanceCreate(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    date: str
    status: AttendanceStatusEnum
    school_id: Optional[str] = "SCH-001"

class AttendanceResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str]
    date: str
    status: AttendanceStatusEnum
    school_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# INCIDENTES

class IncidentCreate(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    type: IncidentTypeEnum
    description: str
    severity: IncidentSeverityEnum
    school_id: Optional[str] = "SCH-001"

class IncidentResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str]
    type: IncidentTypeEnum
    description: str
    severity: IncidentSeverityEnum
    school_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# AUTH

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
