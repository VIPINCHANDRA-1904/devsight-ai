"""
DEVSIGHTAI Backend — Core Configuration

Loads environment variables and exposes typed settings.
All secrets come from .env — nothing is hardcoded.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    # Groq AI
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # JWT Auth
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "devsightai-dev-secret-change-in-prod")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://devsight-ai.vercel.app")


settings = Settings()
