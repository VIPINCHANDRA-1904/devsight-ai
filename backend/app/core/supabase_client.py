"""
DEVSIGHTAI Backend — Supabase Client

Uses SUPABASE_SERVICE_KEY to bypass RLS for server-side writes.
This client must NEVER be exposed to the frontend.
"""

import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger("devsightai.supabase")

supabase: Optional[Client] = None

if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
    try:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        supabase = None
else:
    logger.warning(
        "[DEVSIGHTAI] SUPABASE_URL or SUPABASE_SERVICE_KEY not set. "
        "Database operations will return 503 until credentials are added in .env."
    )
