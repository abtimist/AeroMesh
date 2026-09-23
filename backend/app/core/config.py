import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Environment
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # Database (PostgreSQL + PostGIS)
    DATABASE_URL: str = "postgresql://aeromesh:aeromesh_secret@localhost:5432/aeromesh_db"
    
    # Third-Party APIs
    OPENAQ_API_KEY: str | None = None
    NASA_FIRMS_API_KEY: str | None = None
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    
    # Alerting Services
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_FROM_NUMBER: str | None = None
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
