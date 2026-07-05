from sqlalchemy.orm import Session
from typing import List
from app.models.models import Attendance, Incident
from app.schemas.schemas import AttendanceCreate, IncidentCreate

class AttendanceRepository:

    def get_by_student(self, db: Session, student_id: str) -> List[Attendance]:
        return db.query(Attendance).filter(
            Attendance.student_id == student_id
        ).order_by(Attendance.date.desc()).all()

    def get_by_student_and_date(self, db: Session, student_id: str, date: str):
        return db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.date == date
        ).first()

    def create(self, db: Session, data: AttendanceCreate) -> Attendance:
        attendance = Attendance(**data.model_dump())
        db.add(attendance)
        db.commit()
        db.refresh(attendance)
        return attendance

class IncidentRepository:

    def get_by_student(self, db: Session, student_id: str) -> List[Incident]:
        return db.query(Incident).filter(
            Incident.student_id == student_id
        ).order_by(Incident.created_at.desc()).all()

    def create(self, db: Session, data: IncidentCreate) -> Incident:
        incident = Incident(**data.model_dump())
        db.add(incident)
        db.commit()
        db.refresh(incident)
        return incident

attendance_repo = AttendanceRepository()
incident_repo = IncidentRepository()
