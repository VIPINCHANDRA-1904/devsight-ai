"""
DEVSIGHTAI — Events Ingestion Router

POST /api/events     → Ingest HTTP request events from instrumented applications
GET  /api/events     → Query events for a service (used to compute error rate, request rate)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta

from app.models.schemas import EventPayload
from app.core.supabase_client import supabase

router = APIRouter(prefix="/api/events", tags=["Events"])


@router.post("/", status_code=201)
async def ingest_event(payload: EventPayload):
    """
    Ingest an HTTP request event from an instrumented application.

    Each event captures endpoint, method, status_code, response_time.
    The backend computes request rate and error rate from these events,
    so the caller doesn't need to calculate them.
    """
    data = {
        "service_id": payload.service_id,
        "endpoint": payload.endpoint,
        "method": payload.method,
        "status_code": payload.status_code,
        "response_time": payload.response_time,
        "timestamp": payload.timestamp.isoformat(),
    }

    try:
        result = supabase.table("events").insert(data).execute()
        return {"status": "ok", "inserted": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert event: {str(e)}")


@router.get("/")
async def get_events(
    service_id: str = Query(..., description="Filter by service"),
    window: Optional[str] = Query("1h", description="Time window (e.g. '1h', '30m')"),
    limit: int = Query(200, ge=1, le=1000),
):
    """
    Query events for a service within a time window.

    Returns raw events; the dashboard can aggregate these into:
    - Request Rate (count per minute)
    - Error Rate (status >= 500 / total * 100)
    - Average Response Time
    """
    # Parse time window
    try:
        amount = int(window[:-1])
        unit = window[-1]
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
        result = (
            supabase.table("events")
            .select("*")
            .eq("service_id", service_id)
            .gte("timestamp", since)
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )

        return {"data": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch events: {str(e)}")


@router.get("/stats")
async def get_event_stats(
    service_id: str = Query(..., description="Service to compute stats for"),
    window: Optional[str] = Query("5m", description="Aggregation window"),
):
    """
    Compute request rate, error rate, and avg response time for a service.

    This endpoint is used by the anomaly detection pipeline and the dashboard.
    """
    # Parse time window
    try:
        amount = int(window[:-1])
        unit = window[-1]
        if unit == "h":
            delta = timedelta(hours=amount)
        elif unit == "m":
            delta = timedelta(minutes=amount)
        else:
            delta = timedelta(minutes=5)
    except (ValueError, IndexError):
        delta = timedelta(minutes=5)

    since = (datetime.utcnow() - delta).isoformat()

    try:
        result = (
            supabase.table("events")
            .select("status_code,response_time")
            .eq("service_id", service_id)
            .gte("timestamp", since)
            .execute()
        )

        events = result.data
        total = len(events)

        if total == 0:
            return {
                "service_id": service_id,
                "window": window,
                "total_requests": 0,
                "error_count": 0,
                "error_rate": 0.0,
                "avg_response_time": 0.0,
                "requests_per_minute": 0.0,
            }

        error_count = sum(1 for e in events if e["status_code"] >= 500)
        avg_response_time = sum(e["response_time"] for e in events) / total
        minutes = delta.total_seconds() / 60
        requests_per_minute = total / minutes if minutes > 0 else total

        return {
            "service_id": service_id,
            "window": window,
            "total_requests": total,
            "error_count": error_count,
            "error_rate": round((error_count / total) * 100, 2),
            "avg_response_time": round(avg_response_time, 4),
            "requests_per_minute": round(requests_per_minute, 1),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute stats: {str(e)}")
