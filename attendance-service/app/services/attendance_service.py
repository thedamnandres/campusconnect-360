from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
from app.repositories.attendance_repository import attendance_repo, incident_repo
from app.schemas.schemas import AttendanceCreate, IncidentCreate
from app.models.models import Attendance, Incident
from app.events.publisher import enqueue_event
from app.services.academic_client import academic_client, AcademicServiceUnavailable

class AttendanceService:

    # ESTUDIANTES (consulta al academic-service)

    async def list_students(self, token: str) -> list:
        try:
            return await academic_client.list_students(token)
        except AcademicServiceUnavailable:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="academic-service no disponible"
            )

    # ASISTENCIA

    async def register_attendance(self, db: Session, data: AttendanceCreate, token: str) -> Attendance:
        try:
            student = await academic_client.get_student(data.student_id, token)
        except AcademicServiceUnavailable:
            raise HTTPException(status_code=503, detail="academic-service no disponible")
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")

        data = data.model_copy(update={
            "student_name": f"{student['first_name']} {student['last_name']}",
            "school_id": student["school_id"],
        })
        existing = attendance_repo.get_by_student_and_date(db, data.student_id, data.date)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe registro de asistencia para el estudiante en {data.date}"
            )

        try:
            attendance = attendance_repo.create(db, data)
            enqueue_event(
                db,
                "AttendanceRecorded",
                {
                    "attendanceId": attendance.id,
                    "studentId":    attendance.student_id,
                    "schoolId":     attendance.school_id,
                    "date":         attendance.date,
                    "status":       attendance.status.value,
                    "studentName":  attendance.student_name,
                },
                deduplication_key=f"AttendanceRecorded:{attendance.id}",
            )
            db.commit()
            db.refresh(attendance)
            return attendance
        except Exception:
            db.rollback()
            raise

    def get_student_attendance(self, db: Session, student_id: str) -> List[Attendance]:
        return attendance_repo.get_by_student(db, student_id)

    # INCIDENTES

    async def report_incident(self, db: Session, data: IncidentCreate, token: str) -> Incident:
        try:
            student = await academic_client.get_student(data.student_id, token)
        except AcademicServiceUnavailable:
            raise HTTPException(status_code=503, detail="academic-service no disponible")
        if not student:
            raise HTTPException(status_code=404, detail="Estudiante no encontrado")

        data = data.model_copy(update={
            "student_name": f"{student['first_name']} {student['last_name']}",
            "school_id": student["school_id"],
        })
        try:
            incident = incident_repo.create(db, data)
            enqueue_event(
                db,
                "IncidentReported",
                {
                    "incidentId":  incident.id,
                    "studentId":   incident.student_id,
                    "schoolId":    incident.school_id,
                    "type":        incident.type.value,
                    "description": incident.description,
                    "severity":    incident.severity.value,
                    "studentName": incident.student_name,
                },
                deduplication_key=f"IncidentReported:{incident.id}",
            )
            db.commit()
            db.refresh(incident)
            return incident
        except Exception:
            db.rollback()
            raise

    def get_student_incidents(self, db: Session, student_id: str) -> List[Incident]:
        return incident_repo.get_by_student(db, student_id)

attendance_service = AttendanceService()
