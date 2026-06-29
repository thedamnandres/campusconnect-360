from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from app.repositories.payment_repository import payment_repo
from app.schemas.schemas import PaymentCreate
from app.models.models import Payment, PaymentStatusEnum
from app.events.publisher import publish_event
from app.services.academic_client import academic_client, AcademicServiceUnavailable

class PaymentService:

    # CONSULTAS

    def list_payments(self, db: Session, skip: int = 0, limit: int = 100) -> List[Payment]:
        return payment_repo.get_all(db, skip, limit)

    def list_pending(self, db: Session, skip: int = 0, limit: int = 100) -> List[Payment]:
        return payment_repo.get_by_status(db, PaymentStatusEnum.PENDIENTE, skip, limit)

    def get_payment(self, db: Session, payment_id: str) -> Payment:
        payment = payment_repo.get_by_id(db, payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        return payment

    def get_by_student(self, db: Session, student_id: str) -> List[Payment]:
        return payment_repo.get_by_student(db, student_id)

    # REGISTRO DE OBLIGACION DE PAGO

    def create_payment(self, db: Session, data: PaymentCreate, authorization: str) -> Payment:
        try:
            student = academic_client.get_student(data.student_id, authorization)
        except AcademicServiceUnavailable:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="No se pudo validar el estudiante: academic-service no disponible"
            )

        if not student:
            raise HTTPException(
                status_code=404,
                detail=f"Estudiante {data.student_id} no encontrado en academic-service"
            )

        student_name = f"{student['first_name']} {student['last_name']}"
        school_id = data.school_id or student.get("school_id", "SCH-001")

        return payment_repo.create(
            db,
            student_id=data.student_id,
            student_name=student_name,
            school_id=school_id,
            amount=data.amount,
            concept=data.concept,
        )

    # CONFIRMACION DE PAGO

    async def confirm_payment(self, db: Session, payment_id: str) -> Payment:
        payment = self.get_payment(db, payment_id)

        # Idempotencia: un pago ya confirmado o fallido no se vuelve a procesar.
        if payment.status == PaymentStatusEnum.CONFIRMADO:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El pago ya fue confirmado previamente"
            )
        if payment.status == PaymentStatusEnum.FALLIDO:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El pago quedó marcado como fallido; debe registrarse una nueva obligación"
            )

        try:
            await publish_event("PaymentConfirmed", {
                "paymentId":   payment.id,
                "studentId":   payment.student_id,
                "schoolId":    payment.school_id,
                "amount":      payment.amount,
                "concept":     payment.concept,
                "studentName": payment.student_name,
            })
        except Exception:
            payment_repo.mark_failed(db, payment)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="No se pudo publicar el evento PaymentConfirmed; el pago quedó marcado como fallido"
            )

        return payment_repo.mark_confirmed(db, payment)

payment_service = PaymentService()
