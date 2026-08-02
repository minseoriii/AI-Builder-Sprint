from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Polaris API"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    database_url: str = ""

    supabase_url: str = ""
    supabase_publishable_key: str = ""

    upstage_api_key: str = ""
    upstage_base_url: str = "https://api.upstage.ai/v1"
    upstage_model: str = "solar-pro3"

    ai_timeout_seconds: int = 60
    supabase_auth_timeout_seconds: int = 10
    north_star_analysis_ttl_hours: int = 24
    daily_record_analysis_ttl_hours: int = 24
    comet_recommendation_ttl_hours: int = 24
    default_timezone: str = "Asia/Seoul"
    cors_origins: str = "http://localhost:8081,http://localhost:19006"
    enable_demo_ui: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def database_configured(self) -> bool:
        return bool(self.database_url)

    @property
    def upstage_configured(self) -> bool:
        return bool(self.upstage_api_key)

    @property
    def supabase_auth_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_publishable_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
