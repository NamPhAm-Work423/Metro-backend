from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # App
    NODE_ENV: str = Field(default="development")
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8007)

    # Seed
    SEED_ON_STARTUP: bool = Field(default=False, description="Run seed data generation on service startup")

    # Database
    DATABASE_URL: str = Field(default="postgresql://postgres:password@localhost:5432/metro_report")

    # Kafka
    KAFKA_BROKERS: str = Field(default="localhost:9092")
    KAFKA_GROUP_ID: str = Field(default="report-service")
    KAFKA_CLIENT_ID: str = Field(default="report-service")

    # Service-to-service auth (align with system middlewares)
    SERVICE_JWT_SECRET: str = Field(default="change-me")
    # Backward-compat alias (optional). If both set, prefer SERVICE_JWT_SECRET
    SERVICE_AUTH_SECRET: str = Field(default="", description="Deprecated alias; prefer SERVICE_JWT_SECRET")
    SERVICE_AUTH_ISSUER: str = Field(default="api-gateway")
    SERVICE_AUTH_AUDIENCE: str = Field(default="internal-services")

    # End-user access token (stored in cookie or Authorization header)
    JWT_ACCESS_SECRET: str = Field(default="change-me-access")

    # Topics
    USER_CREATED_TOPIC: str = Field(default="user.created")
    USER_LOGIN_TOPIC: str = Field(default="user.login")
    TICKET_CREATED_TOPIC: str = Field(default="ticket.created")
    TICKET_ACTIVATED_TOPIC: str = Field(default="ticket.activated")
    TICKET_CANCELLED_TOPIC: str = Field(default="ticket.cancelled")
    TICKET_USED_TOPIC: str = Field(default="ticket.used")

    # Pydantic v2 configuration
    model_config = SettingsConfigDict(
        case_sensitive=False,
        env_file=".env",
        extra="ignore",
    )

    @property
    def kafka_brokers_list(self) -> List[str]:
        return [b.strip() for b in self.KAFKA_BROKERS.split(',') if b.strip()]

    @property
    def service_secret(self) -> str:
        # Prefer standard name used by other services
        return self.SERVICE_JWT_SECRET or self.SERVICE_AUTH_SECRET


@lru_cache()
def get_settings() -> Settings:
    return Settings()  # type: ignore


