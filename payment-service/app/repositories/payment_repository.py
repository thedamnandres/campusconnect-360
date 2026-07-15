from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from app.models.models import Payment, PaymentStatusEnum

class PaymentRepository:

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[Payment]:
        return db.query(Payment).order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()

    def get_by_status(self, db: Session, status: PaymentStatusEnum, skip: int = 0, limit: int = 100) -> List[Payment]:
        return db.query(Payment).filter(Payment.status == status).order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()

    def get_by_id(self, db: Session, payment_id: str) -> Optional[Payment]:
        return db.query(Payment).filter(Payment.id == payment_id).first()

    def get_by_student(self, db: Session, student_id: str) -> List[Payment]:
        return db.query(Payment).filter(Payment.student_id == student_id).order_by(Payment.created_at.desc()).all()

    def create(self, db: Session, student_id: str, student_name: str, school_id: str, amount: float, concept: str) -> Payment:
        payment = Payment(
            student_id=student_id,
            student_name=student_name,
            school_id=school_id,
            amount=amount,
            concept=concept,
            status=PaymentStatusEnum.PENDIENTE,
        )
        db.add(payment)
        db.flush()
        return payment

    def mark_confirmed(self, db: Session, payment: Payment) -> Payment:
        payment.status = PaymentStatusEnum.CONFIRMADO
        payment.confirmed_at = datetime.utcnow()
        return payment

    def mark_failed(self, db: Session, payment: Payment) -> Payment:
        payment.status = PaymentStatusEnum.FALLIDO
        db.commit()
        db.refresh(payment)
        return payment

payment_repo = PaymentRepository()
