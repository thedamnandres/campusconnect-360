from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.models import FinancialStatusEnum, EnrollmentStatusEnum

# Red de colegios soportada por el sistema (catálogo fijo, sin tabla propia).
SCHOOL_IDS = {"SCH-GOTITAS", "SCH-SANGABRIEL"}

# STUDENT

class StudentCreate(BaseModel):
    cedula: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    representative_name: Optional[str] = None
    representative_email: Optional[str] = None
    representative_phone: Optional[str] = None
    school_id: str

    @field_validator("school_id")
    @classmethod
    def validate_school_id(cls, value):
        if value not in SCHOOL_IDS:
            raise ValueError(f"school_id debe ser uno de: {', '.join(sorted(SCHOOL_IDS))}")
        return value

class StudentUpdate(BaseModel):
    phone: Optional[str] = None
    representative_name: Optional[str] = None
    representative_email: Optional[str] = None
    representative_phone: Optional[str] = None
    financial_status: Optional[FinancialStatusEnum] = None

class StudentResponse(BaseModel):
    id: str
    cedula: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    birth_date: Optional[str]
    representative_name: Optional[str]
    representative_email: Optional[str]
    representative_phone: Optional[str]
    school_id: str
    financial_status: FinancialStatusEnum
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ENROLLMENT

class EnrollmentCreate(BaseModel):
    student_id: str
    grade: str
    section: Optional[str] = None
    school_year: str
    notes: Optional[str] = None

class EnrollmentResponse(BaseModel):
    id: str
    student_id: str
    grade: str
    section: Optional[str]
    school_year: str
    school_id: str
    status: EnrollmentStatusEnum
    notes: Optional[str]
    enrolled_at: datetime

    class Config:
        from_attributes = True

class StudentWithEnrollments(StudentResponse):
    enrollments: List[EnrollmentResponse] = []

# AUTH

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"