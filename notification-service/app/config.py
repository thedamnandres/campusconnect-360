from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    RABBITMQ_URL: str
    JWT_SECRET: str = "supersecretkey_change_in_prod"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480
    SERVICE_PORT: int = 8003

    class Config:
        env_file = ".env"

settings = Settings()
