from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""

    # API Keys
    anthropic_api_key: str = ""

    # Database
    database_url: str = "sqlite:///./healthops.db"

    # Application
    debug: bool = True
    cors_origins: str = "http://localhost:3000"

    # User (hardcoded for MVP - no auth)
    default_user_id: str = "user_001"

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
