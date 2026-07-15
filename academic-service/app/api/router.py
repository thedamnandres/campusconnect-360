from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.auth import get_current_user, require_role, create_access_token, DEMO_USERS
from app.schemas.schemas import (
    StudentCreate, StudentUpdate, StudentResponse,
    StudentWithEnrollments, EnrollmentCreate, EnrollmentResponse,
    LoginRequest, TokenResponse
)
from app.services.academic_service import academic_service
from fastapi import HTTPException
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

@router.get("/students", response_model=List[StudentResponse], tags=["Estudiantes"])
def list_students(
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = Query(None, description="Buscar por nombre, cédula o email"),
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user)
):
    if q:
        return academic_service.search_students(db, q)
    return academic_service.list_students(db, skip, limit)


@router.get("/students/enrolled", response_model=List[StudentResponse], tags=["Estudiantes"])
def list_enrolled_students(
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("finance", "admin")),
):
    return academic_service.list_enrolled_students(db)

@router.get("/students/{student_id}", response_model=StudentWithEnrollments, tags=["Estudiantes"])
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user)
):
    return academic_service.get_student(db, student_id)

@router.post("/students", response_model=StudentResponse, status_code=201, tags=["Estudiantes"])
async def create_student(
    body: StudentCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("academic", "admin"))
):
    return await academic_service.create_student(db, body)

@router.patch("/students/{student_id}", response_model=StudentResponse, tags=["Estudiantes"])
def update_student(
    student_id: str,
    body: StudentUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("academic", "admin", "finance"))
):
    return academic_service.update_student(db, student_id, body)

# MATRICULAS

@router.post("/enrollments", response_model=EnrollmentResponse, status_code=201, tags=["Matrículas"])
async def enroll_student(
    body: EnrollmentCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("academic", "admin"))
):
    return await academic_service.enroll_student(db, body)

@router.get("/students/{student_id}/enrollments", response_model=List[EnrollmentResponse], tags=["Matrículas"])
def get_student_enrollments(
    student_id: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user)
):
    return academic_service.get_enrollments(db, student_id)

# HEALTH CHECK

@router.get("/health", tags=["Health"])
async def health():
    snapshot = await health_snapshot()
    return JSONResponse(status_code=200 if snapshot["status"] == "ok" else 503, content=snapshot)
