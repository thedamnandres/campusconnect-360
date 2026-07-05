from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.auth import get_current_user
from app.models.models import Notification, NotificationStatusEnum
from app.schemas.schemas import NotificationResponse

router = APIRouter()

@router.get("/notifications", response_model=List[NotificationResponse], tags=["Notificaciones"])
def list_notifications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user)
):
    return db.query(Notification).offset(skip).limit(limit).all()

@router.get("/notifications/student/{student_id}", response_model=List[NotificationResponse], tags=["Notificaciones"])
def list_notifications_by_student(
    student_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user)
):
    return db.query(Notification).filter(Notification.student_id == student_id).offset(skip).limit(limit).all()

@router.get("/notifications/failed", response_model=List[NotificationResponse], tags=["Notificaciones"])
def list_failed_notifications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user)
):
    return db.query(Notification).filter(Notification.status == NotificationStatusEnum.FALLIDA).offset(skip).limit(limit).all()

@router.post("/notifications/{id}/retry", response_model=NotificationResponse, tags=["Notificaciones"])
def retry_notification(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user)
):
    notification = db.query(Notification).filter(Notification.id == id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    if notification.status != NotificationStatusEnum.FALLIDA:
        raise HTTPException(status_code=400, detail="Solo se pueden reintentar notificaciones con estado fallida")

    notification.status = NotificationStatusEnum.ENVIADA
    db.commit()
    db.refresh(notification)
    return notification

@router.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "notification-service"}
