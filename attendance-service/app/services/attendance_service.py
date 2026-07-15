from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List
import httpx
from app.repositories.attendance_repository import attendance_repo, incident_repo
from app.schemas.schemas import AttendanceCreate, IncidentCreate
from app.models.models import Attendance, Incident
from app.events.publisher import publish_event
from app.config import settings

class AttendanceService:

    # ESTUDIANTES (consulta al academic-service)

    async def list_students(self, token: str) -> list:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{settings.ACADEMIC_SERVICE_URL}/students",
                    headers={"Authorization": f"Bearer {token}"}
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail="Error consultando estudiantes al academic-service"
            )
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="academic-service no disponible"
            )

    # ASISTENCIA

    async def register_attendance(self, db: Session, data: AttendanceCreate) -> Attendance:
        existing = attendance_repo.get_by_student_and_date(db, data.student_id, data.date)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya existe registro de asistencia para el estudiante en {data.date}"
            )

        attendance = attendance_repo.create(db, data)

        await publish_event("AttendanceRecorded", {
            "attendanceId": attendance.id,
            "studentId":    attendance.student_id,
            "schoolId":     attendance.school_id,
            "date":         attendance.date,
            "status":       attendance.status.value,
            "studentName":  attendance.student_name,
        })

        return attendance

    def get_student_attendance(self, db: Session, student_id: str) -> List[Attendance]:
        return attendance_repo.get_by_student(db, student_id)

    # INCIDENTES

    async def report_incident(self, db: Session, data: IncidentCreate) -> Incident:
        incident = incident_repo.create(db, data)

        await publish_event("IncidentReported", {
            "incidentId":  incident.id,
            "studentId":   incident.student_id,
            "schoolId":    incident.school_id,
            "type":        incident.type.value,
            "description": incident.description,
            "severity":    incident.severity.value,
            "studentName": incident.student_name,
        })

        return incident

    def get_student_incidents(self, db: Session, student_id: str) -> List[Incident]:
        return incident_repo.get_by_student(db, student_id)

attendance_service = AttendanceService()
