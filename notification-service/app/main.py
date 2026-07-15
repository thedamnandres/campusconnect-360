from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import logging
from contextlib import asynccontextmanager

from app.api.router import router
from app.database import engine
from app.models.models import Base
from app.events.consumer import start_consumer
from app.events.publisher import start_outbox_publisher

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
    title="CampusConnect 360 — Notification Service",
    description="Servicio de notificaciones y gestión de resiliencia / DLQ.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
