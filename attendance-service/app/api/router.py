from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.auth import require_role, create_access_token, DEMO_USERS, bearer_scheme
from app.schemas.schemas import (
    AttendanceCreate, AttendanceResponse,
    IncidentCreate, IncidentResponse,
    LoginRequest, TokenResponse
)
from app.services.attendance_service import attendance_service
from fastapi.responses import JSONResponse
from app.health import health_snapshot

router = APIRouter()

# AUTH

@router.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
def login(body: LoginRequest):
    user = DEMO_USERS.get(body.username)
    if not user or user["password"] != body.password:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_access_token({"sub": body.username, "role": user["role"]})
    return {"access_token": token}

# ESTUDIANTES

@router.get("/students", tags=["Estudiantes"])
async def list_students(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    _: dict = Depends(require_role("teacher", "admin"))
):
    return await attendance_service.list_students(credentials.credentials)

# ASISTENCIA

@router.post("/attendance", response_model=AttendanceResponse, status_code=201, tags=["Asistencia"])
async def register_attendance(
    body: AttendanceCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("teacher", "admin"))
):
    return await attendance_service.register_attendance(db, body, credentials.credentials)

@router.get("/attendance/student/{student_id}", response_model=List[AttendanceResponse], tags=["Asistencia"])
def get_student_attendance(
    student_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("academic", "teacher", "admin"))
):
    return attendance_service.get_student_attendance(db, student_id)

# INCIDENTES

@router.post("/incidents", response_model=IncidentResponse, status_code=201, tags=["Incidentes"])
async def report_incident(
    body: IncidentCreate,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("teacher", "admin"))
):
    return await attendance_service.report_incident(db, body, credentials.credentials)

@router.get("/incidents/student/{student_id}", response_model=List[IncidentResponse], tags=["Incidentes"])
def get_student_incidents(
    student_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("academic", "teacher", "admin"))
):
    return attendance_service.get_student_incidents(db, student_id)

# HEALTH CHECK

@router.get("/health", tags=["Health"])
async def health():
    snapshot = await health_snapshot()
    return JSONResponse(status_code=200 if snapshot["status"] == "ok" else 503, content=snapshot)
