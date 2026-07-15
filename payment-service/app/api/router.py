from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.auth import require_role
from app.schemas.schemas import PaymentCreate, PaymentResponse
from app.services.payment_service import payment_service
from fastapi.responses import JSONResponse
from app.health import health_snapshot

router = APIRouter()

# PAGOS

@router.get("/payments", response_model=List[PaymentResponse], tags=["Pagos"])
def list_payments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("finance", "director", "admin"))
):
    return payment_service.list_payments(db, skip, limit)

@router.get("/payments/pending", response_model=List[PaymentResponse], tags=["Pagos"])
def list_pending_payments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("finance", "director", "admin"))
):
    return payment_service.list_pending(db, skip, limit)

@router.get("/payments/student/{student_id}", response_model=List[PaymentResponse], tags=["Pagos"])
def get_student_payments(
    student_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("academic", "finance", "director", "admin"))
):
    return payment_service.get_by_student(db, student_id)

@router.post("/payments", response_model=PaymentResponse, status_code=201, tags=["Pagos"])
async def create_payment(
    body: PaymentCreate,
    authorization: str = Header(...),
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("finance", "admin"))
):
    return await payment_service.create_payment_async(db, body, authorization)

@router.post("/payments/{payment_id}/confirm", response_model=PaymentResponse, tags=["Pagos"])
async def confirm_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("finance", "admin"))
):
    return await payment_service.confirm_payment(db, payment_id)

# HEALTH CHECK

@router.get("/health", tags=["Health"])
async def health():
    snapshot = await health_snapshot()
    return JSONResponse(status_code=200 if snapshot["status"] == "ok" else 503, content=snapshot)
