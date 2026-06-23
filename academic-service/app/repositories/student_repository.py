from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from app.models.models import Student, Enrollment
from app.schemas.schemas import StudentCreate, StudentUpdate, EnrollmentCreate

class StudentRepository:

    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[Student]:
        return db.query(Student).filter(Student.is_active == True).offset(skip).limit(limit).all()

    def get_by_id(self, db: Session, student_id: str) -> Optional[Student]:
        return db.query(Student).filter(Student.id == student_id).first()

    def get_by_cedula(self, db: Session, cedula: str) -> Optional[Student]:
        return db.query(Student).filter(Student.cedula == cedula).first()

    def search(self, db: Session, q: str) -> List[Student]:
        term = f"%{q}%"
        return db.query(Student).filter(
            or_(
                Student.first_name.ilike(term),
                Student.last_name.ilike(term),
                Student.cedula.ilike(term),
                Student.email.ilike(term),
            )
        ).all()

    def create(self, db: Session, data: StudentCreate) -> Student:
        student = Student(**data.model_dump())
        db.add(student)
        db.commit()
        db.refresh(student)
        return student

    def update(self, db: Session, student: Student, data: StudentUpdate) -> Student:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(student, field, value)
        db.commit()
        db.refresh(student)
        return student

class EnrollmentRepository:

    def get_by_student(self, db: Session, student_id: str) -> List[Enrollment]:
        return db.query(Enrollment).filter(Enrollment.student_id == student_id).all()

    def get_active_enrollment(self, db: Session, student_id: str) -> Optional[Enrollment]:
        from app.models.models import EnrollmentStatusEnum
        return db.query(Enrollment).filter(
            Enrollment.student_id == student_id,
            Enrollment.status == EnrollmentStatusEnum.ACTIVA
        ).first()

    def create(self, db: Session, data: EnrollmentCreate) -> Enrollment:
        enrollment = Enrollment(**data.model_dump())
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        return enrollment

student_repo = StudentRepository()
enrollment_repo = EnrollmentRepository()