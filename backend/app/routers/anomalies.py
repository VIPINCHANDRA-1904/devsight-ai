"""
DEVSIGHTAI — Anomalies & Predictive Warnings Router

GET  /api/anomalies/{service_id}      -> anomalies for a specific service
GET  /api/anomalies/recent            -> recent anomalies across all services
GET  /api/warnings/{service_id}       -> predictive warnings for a service
GET  /api/warnings/active             -> active (unacknowledged) warnings
PATCH /api/warnings/{warning_id}/acknowledge -> acknowledge a warning
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta

from app.core.supabase_client import supabase

router = APIRouter(tags=["Anomalies & Warnings"])


def _check_db():
    """Raise 503 if Supabase is not configured."""
    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env",
        )


# ──────────────────────────────────────────────
# Anomalies
# ──────────────────────────────────────────────


@router.get("/api/anomalies/recent")
async def get_recent_anomalies(
    limit: int = Query(20, ge=1, le=100),
    window: Optional[str] = Query("24h", description="Time window (e.g. '1h', '24h')"),
):
    """
    Retrieve recent anomalies across all services.

    Used by the overview page to show a live anomaly feed.
    """
    _check_db()

    # Parse time window
    try:
        amount = int(window[:-1])
        unit = window[-1]
        if unit == "h":
            delta = timedelta(hours=amount)
        elif unit == "m":
            delta = timedelta(minutes=amount)
        elif unit == "d":
            delta = timedelta(days=amount)
        else:
            delta = timedelta(hours=24)
    except (ValueError, IndexError):
        delta = timedelta(hours=24)

    since = (datetime.utcnow() - delta).isoformat()

    try:
        result = (
            supabase.table("anomalies")
            .select("*")
            .gte("detected_at", since)
            .order("detected_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"data": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch anomalies: {str(e)}")


@router.get("/api/anomalies/{service_id}")
async def get_anomalies_by_service(
    service_id: str,
    limit: int = Query(50, ge=1, le=200),
    window: Optional[str] = Query("6h", description="Time window"),
):
    """
    Retrieve detected anomalies for a specific service.

    Used by the Recharts MetricChart component to overlay
    anomaly points as red dots on time-series charts.
    """
    _check_db()

    try:
        amount = int(window[:-1])
        unit = window[-1]
        if unit == "h":
            delta = timedelta(hours=amount)
        elif unit == "m":
            delta = timedelta(minutes=amount)
        else:
            delta = timedelta(hours=6)
    except (ValueError, IndexError):
        delta = timedelta(hours=6)

    since = (datetime.utcnow() - delta).isoformat()

    try:
        result = (
            supabase.table("anomalies")
            .select("*")
            .eq("service_id", service_id)
            .gte("detected_at", since)
            .order("detected_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"data": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch anomalies: {str(e)}")


# ──────────────────────────────────────────────
# Predictive Warnings
# ──────────────────────────────────────────────


@router.get("/api/warnings/active")
async def get_active_warnings(
    limit: int = Query(20, ge=1, le=100),
):
    """
    Retrieve active (unacknowledged) predictive warnings across all services.

    Used by the WarningBanner component on the dashboard.
    """
    _check_db()

    try:
        result = (
            supabase.table("predicted_warnings")
            .select("*")
            .eq("acknowledged", False)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"data": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch warnings: {str(e)}")


@router.get("/api/warnings/{service_id}")
async def get_warnings_by_service(
    service_id: str,
    limit: int = Query(20, ge=1, le=100),
    include_acknowledged: bool = Query(False),
):
    """
    Retrieve predictive warnings for a specific service.
    """
    _check_db()

    try:
        query = (
            supabase.table("predicted_warnings")
            .select("*")
            .eq("service_id", service_id)
        )

        if not include_acknowledged:
            query = query.eq("acknowledged", False)

        result = (
            query
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"data": result.data, "count": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch warnings: {str(e)}")


@router.patch("/api/warnings/{warning_id}/acknowledge")
async def acknowledge_warning(warning_id: int):
    """
    Mark a predictive warning as acknowledged.

    Called by the WarningBanner dismiss button.
    """
    _check_db()

    try:
        result = (
            supabase.table("predicted_warnings")
            .update({"acknowledged": True})
            .eq("id", warning_id)
            .execute()
        )

        if not result.data:
            raise HTTPException(status_code=404, detail=f"Warning {warning_id} not found")

        return {"status": "ok", "warning_id": warning_id, "acknowledged": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge warning: {str(e)}")
