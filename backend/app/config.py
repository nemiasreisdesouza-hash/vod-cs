"""Application settings loaded from environment variables."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "VOD Analyst Pro"
    environment: str = "development"
    database_url: str = "postgresql+psycopg2://vod:vodsecret@localhost:5432/vodanalyst"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    refresh_token_days: int = 14
    s3_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "vod-demos"
    minio_user: str = "minioadmin"
    minio_password: str = "minioadmin123"
    upload_dir: str = "/tmp/vod_uploads"
    seed_demo_data: bool = True
    cors_origins: str = "http://localhost:3000"
    max_upload_mb: int = 600

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
