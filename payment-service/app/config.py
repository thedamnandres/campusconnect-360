from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    RABBITMQ_URL: str
    ACADEMIC_SERVICE_URL: str = "http://academic-service:8001"
    JWT_SECRET: str = "supersecretkey_change_in_prod"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480
    SERVICE_PORT: int = 8002

    class Config:
        env_file = ".env"

settings = Settings()
