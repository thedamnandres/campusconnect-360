from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router
from app.database import engine
from app.models.models import Base
from app.events.publisher import start_outbox_publisher
import logging
import asyncio
from contextlib import asynccontextmanager

logging.basicConfig(level=logging.INFO)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    outbox_task = asyncio.create_task(start_outbox_publisher())
    yield
    outbox_task.cancel()
    await asyncio.gather(outbox_task, return_exceptions=True)

app = FastAPI(
    title="CampusConnect 360 — Payment Service",
    description="Gestión de pagos y obligaciones financieras de estudiantes.",
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

app.include_router(router)
