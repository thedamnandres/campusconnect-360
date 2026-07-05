from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, create_access_token, DEMO_USERS, bearer_scheme
from app.schemas.schemas import DashboardResponse, LoginRequest, TokenResponse
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
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    _: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await analytics_service.get_dashboard(db, credentials.credentials)

# HEALTH CHECK

@router.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "analytics-service"}
