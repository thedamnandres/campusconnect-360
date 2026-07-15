from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from app.repositories.student_repository import student_repo, enrollment_repo
from app.schemas.schemas import StudentCreate, StudentUpdate, EnrollmentCreate
from app.models.models import Student, Enrollment
from app.events.publisher import enqueue_event

class AcademicService:

    # ESTUDIANTES

    def list_students(self, db: Session, skip: int = 0, limit: int = 100) -> List[Student]:
        return student_repo.get_all(db, skip, limit)

    def search_students(self, db: Session, q: str) -> List[Student]:
        return student_repo.search(db, q)

    def list_enrolled_students(self, db: Session) -> List[Student]:
        return student_repo.get_enrolled(db)

    def get_student(self, db: Session, student_id: str) -> Student:
        student = student_repo.get_by_id(db, student_id)
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")
        return student

    async def create_student(self, db: Session, data: StudentCreate) -> Student:
        if student_repo.get_by_cedula(db, data.cedula):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un estudiante con cédula {data.cedula}"
            )
        if student_repo.get_by_email(db, data.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe un estudiante con correo {data.email}"
            )
        student = student_repo.create(db, data)
        return student

    def update_student(self, db: Session, student_id: str, data: StudentUpdate) -> Student:
        student = self.get_student(db, student_id)
        return student_repo.update(db, student, data)

    # MATRICULAS

    async def enroll_student(self, db: Session, data: EnrollmentCreate) -> Enrollment:
        student = self.get_student(db, data.student_id)

        existing = enrollment_repo.get_active_enrollment(db, data.student_id)
        if existing and existing.school_year == data.school_year:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El estudiante ya tiene matrícula activa para {data.school_year}"
            )

        # La matrícula siempre pertenece al colegio del estudiante: no se
        # vuelve a pedir en el formulario ni se acepta un valor distinto.
        try:
            enrollment = enrollment_repo.create(db, data, school_id=student.school_id)
            enqueue_event(
                db,
                "StudentEnrolled",
                {
                    "studentId":           student.id,
                    "schoolId":            enrollment.school_id,
                    "grade":               enrollment.grade,
                    "section":             enrollment.section,
                    "schoolYear":          enrollment.school_year,
                    "studentName":         f"{student.first_name} {student.last_name}",
                    "representativeEmail": student.representative_email,
                    "enrollmentId":        enrollment.id,
                },
                deduplication_key=f"StudentEnrolled:{enrollment.id}",
            )
            db.commit()
            db.refresh(enrollment)
            return enrollment
        except Exception:
            db.rollback()
            raise

    def get_enrollments(self, db: Session, student_id: str) -> List[Enrollment]:
        self.get_student(db, student_id)
        return enrollment_repo.get_by_student(db, student_id)

academic_service = AcademicService()
