import os
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pydantic import Field

class Settings(BaseSettings):
    db_url: str = Field(..., alias="DATABASE_URL")
    postgres_user: str
    postgres_password: str
    postgres_db: str
    token_mapbox: str

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()

# 🔹 Inicializa templates e static SOMENTE na API
if os.environ.get("RUN_ENV") == "api":
    templates = Jinja2Templates(directory="/templates")
    static_files = StaticFiles(directory="/static")
else:
    templates = None
    static_files = None
