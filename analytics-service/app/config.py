from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    RABBITMQ_URL: str
    PAYMENT_SERVICE_URL: str = "http://payment-service:8002"
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8003"
    JWT_SECRET: str = "supersecretkey_change_in_prod"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    class Config:
        env_file = ".env"

settings = Settings()
