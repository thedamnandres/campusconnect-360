from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from app.api.router import router
from app.database import engine
from app.models.models import Base
from app.events.consumer import start_consumer
from app.events.publisher import start_outbox_publisher
from contextlib import asynccontextmanager
import asyncio
import logging

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    consumer_task = asyncio.create_task(start_consumer())
    outbox_task = asyncio.create_task(start_outbox_publisher())
    yield
    for task in (consumer_task, outbox_task):
        task.cancel()
    await asyncio.gather(consumer_task, outbox_task, return_exceptions=True)

app = FastAPI(
    title="CampusConnect 360 — Academic Service",
    description="Gestión de estudiantes, matrículas y eventos académicos.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    return JSONResponse(
        status_code=409,
        content={"detail": "El registro entra en conflicto con datos existentes (dato duplicado)."},
    )

app.include_router(router)
