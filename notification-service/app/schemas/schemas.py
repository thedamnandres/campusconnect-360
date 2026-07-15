from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.models import NotificationStatusEnum

class NotificationResponse(BaseModel):
    id: str
    student_id: Optional[str] = None
    school_id: Optional[str] = None
    type: str
    message: str
    status: NotificationStatusEnum
    trigger_event: str
    correlation_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
