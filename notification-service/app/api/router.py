from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.auth import require_role
from app.models.models import Notification, NotificationStatusEnum
from app.schemas.schemas import NotificationResponse
from app.events.dlq import get_dlq_status, replay_dlq
from app.events.publisher import enqueue_event
from fastapi.responses import JSONResponse
from app.health import health_snapshot

router = APIRouter()

@router.get("/notifications", response_model=List[NotificationResponse], tags=["Notificaciones"])
def list_notifications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("director", "admin"))
):
    return db.query(Notification).offset(skip).limit(limit).all()

@router.get("/notifications/student/{student_id}", response_model=List[NotificationResponse], tags=["Notificaciones"])
def list_notifications_by_student(
    student_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("academic", "director", "admin"))
):
    return db.query(Notification).filter(Notification.student_id == student_id).offset(skip).limit(limit).all()

@router.get("/notifications/failed", response_model=List[NotificationResponse], tags=["Notificaciones"])
def list_failed_notifications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("director", "admin"))
):
    return db.query(Notification).filter(Notification.status == NotificationStatusEnum.FALLIDA).offset(skip).limit(limit).all()

@router.post("/notifications/{id}/retry", response_model=NotificationResponse, tags=["Notificaciones"])
def retry_notification(
    id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("director", "admin"))
):
    notification = db.query(Notification).filter(Notification.id == id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    if notification.status != NotificationStatusEnum.FALLIDA:
        raise HTTPException(status_code=400, detail="Solo se pueden reintentar notificaciones con estado fallida")

    try:
        notification.status = NotificationStatusEnum.ENVIADA
        enqueue_event(
            db,
            "NotificationSent",
            {
                "notificationId": notification.id,
                "studentId": notification.student_id,
                "schoolId": notification.school_id,
                "triggerEvent": notification.trigger_event,
                "reprocessed": True,
            },
            deduplication_key=f"NotificationRetry:{notification.id}",
            correlation_id=notification.correlation_id,
        )
        db.commit()
        db.refresh(notification)
        return notification
    except Exception:
        db.rollback()
        raise


@router.get("/dlq/status", tags=["Resiliencia"])
async def dlq_status(
    _: dict = Depends(require_role("director", "admin")),
):
    return await get_dlq_status()


@router.post("/dlq/replay", tags=["Resiliencia"])
async def dlq_replay(
    limit: int = 100,
    _: dict = Depends(require_role("director", "admin")),
):
    return await replay_dlq(limit)

@router.get("/health", tags=["Health"])
async def health():
    snapshot = await health_snapshot()
    return JSONResponse(status_code=200 if snapshot["status"] == "ok" else 503, content=snapshot)
