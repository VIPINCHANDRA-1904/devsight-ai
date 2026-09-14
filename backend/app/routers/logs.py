"""
DEVSIGHTAI — Logs Ingestion Router

POST /api/logs       → Ingest application log entries (single or batch)
GET  /api/logs       → Query logs with filters (service, level, time window)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta

from app.models.schemas import LogPayload, LogBatchPayload
from app.core.supabase_client import supabase
from app.services.log_classifier import classify_log_level

router = APIRouter(prefix="/api/logs", tags=["Logs"])


def _prepare_log_entry(log: LogPayload) -> dict:
    """Prepare a log entry for insertion — auto-classify level if not provided."""
    level = log.level if log.level else classify_log_level(log.message)
    return {
        "service_id": log.service_id,
        "message": log.message,
        "level": level,
        "source": log.source,
        "timestamp": log.timestamp.isoformat(),
    }


@router.post("/", status_code=201)
async def ingest_log(payload: LogPayload):
    """
    Ingest a single application log entry.

    If 'level' is not provided, the log message is auto-classified
    using regex pattern matching (CRITICAL > ERROR > WARN > INFO).
    """
    entry = _prepare_log_entry(payload)

    try:
        result = supabase.table("logs").insert(entry).execute()
        return {"status": "ok", "classified_level": entry["level"], "inserted": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert log: {str(e)}")


@router.post("/batch", status_code=201)
async def ingest_log_batch(payload: LogBatchPayload):
    """
    Ingest a batch of log entries in one request.

    Each entry is individually classified if level is missing.
    Useful for the log agent sending buffered log lines.
    """
    entries = [_prepare_log_entry(log) for log in payload.logs]

    try:
        result = supabase.table("logs").insert(entries).execute()
        return {"status": "ok", "inserted": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert log batch: {str(e)}")


@router.get("/")
async def get_logs(
    service_id: str = Query(..., description="Filter by service"),
    level: Optional[str] = Query(None, description="Filter by log level (INFO/WARN/ERROR/CRITICAL)"),
    window: Optional[str] = Query(
        None,
        description="Time window (e.g. '1h', '30m', '24h'). Defaults to last 1 hour.",
    ),
    limit: int = Query(100, ge=1, le=500),
):
    """
    Query logs for a specific service with optional filters.

    Used by the dashboard log panel and by the correlation engine
    to count error frequency per 5-min window.
    """
    # Parse time window
    window_str = window or "1h"
    try:
        amount = int(window_str[:-1])
        unit = window_str[-1]
        if unit == "h":
            delta = timedelta(hours=amount)
        elif unit == "m":
            delta = timedelta(minutes=amount)
        else:
            delta = timedelta(hours=1)
    except (ValueError, IndexError):
        delta = timedelta(hours=1)

    since = (datetime.utcnow() - delta).isoformat()

    try:
        query = (
            supabase.table("logs")
            .select("*")
            .eq("service_id", service_id)
            .gte("timestamp", since)
        )

        if level:
            query = query.eq("level", level.upper())

        result = (
            query
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )

        return {"data": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {str(e)}")
