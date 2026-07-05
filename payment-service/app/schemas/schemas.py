from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.models import PaymentStatusEnum

# PAGOS

class PaymentCreate(BaseModel):
    student_id: str
    amount: float = Field(..., gt=0)
    concept: str = Field(..., min_length=1, max_length=200)
    school_id: Optional[str] = None

class PaymentResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    amount: float
    concept: str
    status: PaymentStatusEnum
    school_id: str
    created_at: datetime
    confirmed_at: Optional[datetime]

    class Config:
        from_attributes = True
