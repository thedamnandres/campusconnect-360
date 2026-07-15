from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import require_role, create_access_token, DEMO_USERS, bearer_scheme
from app.schemas.schemas import DashboardResponse, EventTraceResponse, LoginRequest, TokenResponse
from app.repositories.analytics_repository import analytics_repo
from fastapi.responses import JSONResponse
from app.health import health_snapshot
from app.services.analytics_service import analytics_service

router = APIRouter()

# AUTH

@router.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
def login(body: LoginRequest):
    user = DEMO_USERS.get(body.username)
    if not user or user["password"] != body.password:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = create_access_token({"sub": body.username, "role": user["role"]})
    return {"access_token": token}

# DASHBOARD

@router.get("/dashboard", response_model=DashboardResponse, tags=["Dashboard"])
async def get_dashboard(
    school_id: Optional[str] = None,
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    _: dict = Depends(require_role("director", "admin")),
    db: Session = Depends(get_db)
):
    return await analytics_service.get_dashboard(db, credentials.credentials, school_id)


@router.get("/events", response_model=list[EventTraceResponse], tags=["Trazabilidad"])
def get_recent_events(
    limit: int = 20,
    school_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(require_role("director", "admin")),
):
    return analytics_repo.list_event_traces(db, limit, school_id, correlation_id)

# HEALTH CHECK

@router.get("/health", tags=["Health"])
async def health():
    snapshot = await health_snapshot()
    return JSONResponse(status_code=200 if snapshot["status"] == "ok" else 503, content=snapshot)
