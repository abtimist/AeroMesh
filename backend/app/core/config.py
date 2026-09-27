from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Environment
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # Database (PostgreSQL + PostGIS)
    DATABASE_URL: str | None = None
    
    # Third-Party APIs
    OPENAQ_API_KEY: str | None = None
    NASA_FIRMS_API_KEY: str | None = None
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    OPEN_METEO_AQ_URL: str = "https://air-quality-api.open-meteo.com/v1/air-quality"
    OPEN_METEO_API_KEY: str | None = None
    # NOAA supplies authentication instructions with approval; do not guess a scheme.
    HYSPLIT_AUTH_HEADERS: dict[str, str] = {}
    HYSPLIT_BASE_URL: str = "https://apps.arl.noaa.gov/ready2"
    HYSPLIT_POLL_SECONDS: int = 300
    HYSPLIT_DAILY_BUDGET: int = 200
    MODEL_OPERATOR_TOKEN: str | None = None
    
    # Alerting Services
    TWILIO_ACCOUNT_SID: str | None = None
    TWILIO_AUTH_TOKEN: str | None = None
    TWILIO_FROM_NUMBER: str | None = None
    
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[2] / ".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
