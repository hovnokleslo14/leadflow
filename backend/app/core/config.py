from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List
import os


class Settings(BaseSettings):
    app_name: str = "LeadFlow Dashboard"
    app_version: str = "1.0.0"
    debug: bool = True
    secret_key: str = Field(default="dev-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    database_url: str = Field(default="sqlite+aiosqlite:///./leadflow.db")

    admin_username: str = "admin"
    admin_password_hash: str = ""

    openai_api_key: str = ""
    anthropic_api_key: str = ""
    ai_provider: str = "openai"

    discord_bot_token: str = ""
    discord_client_id: str = ""
    discord_client_secret: str = ""
    discord_redirect_uri: str = "http://localhost:3000/auth/discord/callback"

    gotify_url: str = ""
    gotify_token: str = ""

    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "LeadFlow/1.0"

    frontend_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000,http://localhost:5064"

    backend_port: int = 8000
    frontend_port: int = 3000
    redis_url: str = "redis://localhost:6379/0"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()