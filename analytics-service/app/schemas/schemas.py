from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DashboardResponse(BaseModel):
    total_students: int
    total_payments_confirmed: int
    total_payments_pending: int
    total_attendances: int
    total_absences: int
    total_incidents: int
    total_notifications_sent: int
    total_notifications_failed: int
    total_events_processed: int
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True

# AUTH

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EventTraceResponse(BaseModel):
    event_id: str
    correlation_id: str
    event_type: str
    student_id: Optional[str] = None
    school_id: Optional[str] = None
    status: str
    processed_at: datetime

    class Config:
        from_attributes = True
