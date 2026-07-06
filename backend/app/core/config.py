"""Application settings loaded from environment variables (.env locally).

Every variable documented in the repo-root .env.example has a typed field here.
Defaults match the "OPTIONAL" values documented there; required-in-production
values default to obviously-fake placeholders so the stub stack boots without
real credentials (Phase 0 requirement MV-0.1).
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ---------- Core ----------
    environment: str = "local"
    gcp_project_id: str = "your-gcp-project-id"
    gcp_region: str = "us-central1"

    # ---------- Databases ----------
    database_url: str = "postgresql+asyncpg://citypulse:citypulse@localhost:5432/citypulse"
    redis_url: str = "redis://localhost:6379/0"

    # ---------- Google Cloud ----------
    google_application_credentials: str | None = None  # dev only; GKE uses Workload Identity
    bigquery_dataset: str = "citypulse"
    gcs_bucket_raw: str = "your-project-citypulse-raw"
    gcs_bucket_models: str = "your-project-citypulse-models"
    gcs_bucket_photos: str = "your-project-citypulse-photos"

    # ---------- AI / agents ----------
    gemini_api_key: str = "changeme"
    gemini_model: str = "gemini-2.0-flash"
    agent_version: str = "v1.0"

    # ---------- Auth ----------
    firebase_project_id: str = "your-firebase-project"
    jwt_secret: str = "changeme-generate-64-random-bytes"
    jwt_expiry_minutes: int = 60  # SEC-1.2

    # ---------- External data APIs ----------
    openaq_api_key: str = "changeme"
    pune_lat: float = 18.5204
    pune_lon: float = 73.8567

    # ---------- Behavior ----------
    risk_threshold_default: int = 70
    triage_confidence_threshold: float = 0.7
    dedup_radius_meters: int = 250
    dedup_window_hours: int = 6
    rate_limit_public_per_min: int = 20
    rate_limit_auth_per_min: int = 120
    rate_limit_chat_per_min: int = 20
    log_level: str = "INFO"
    agent_processing_enabled: bool = True  # kill switch (SEC-9.1)

    # ---------- Production only ----------
    recaptcha_secret_key: str | None = None
    sentry_dsn: str | None = None
    alert_sandbox_provider_key: str | None = None

    # ---------- Development only ----------
    dev_seed_on_start: bool = False
    dev_mock_gemini: bool = False
    dev_mock_bigquery: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
