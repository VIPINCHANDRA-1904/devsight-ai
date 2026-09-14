"""
DEVSIGHTAI — Metrics Ingestion Router

POST /api/metrics   -> Ingest server-level metrics from the psutil agent
GET  /api/metrics/{service_id} -> Retrieve time-series metrics for a service

Phase 2: After every metric insert, BackgroundTasks trigger:
  - IsolationForest anomaly detection
  - Pandas rolling-window trend analysis
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from typing import Optional
from app.models.schemas import MetricPayload
from app.core.supabase_client import supabase
from app.services.anomaly_detector import run_anomaly_detection
from app.services.trend_analyzer import run_trend_analysis

router = APIRouter(prefix="/api/metrics", tags=["Metrics"])


@router.post("", status_code=201, include_in_schema=False)
@router.post("/", status_code=201)
async def ingest_metrics(payload: MetricPayload, background_tasks: BackgroundTasks):
    """
    Receive server-level metrics from the psutil monitoring agent.

    The agent sends CPU/RAM/Disk/Network every 10 seconds.
    Data is inserted directly into the Supabase metrics table.

    After insert, BackgroundTasks trigger ML anomaly detection
    and trend analysis — never blocking the response.
    """
    data = {
        "server_id": payload.server_id,
        "service_id": payload.service_id,
        "timestamp": payload.timestamp.isoformat(),
        "cpu": payload.cpu,
        "memory": payload.memory,
        "disk": payload.disk,
        "network_sent_mb": payload.network_sent_mb,
        "network_recv_mb": payload.network_recv_mb,
    }

    if not supabase:
        raise HTTPException(
            status_code=503,
            detail="Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env",
        )

    try:
        result = supabase.table("metrics").insert(data).execute()

        # Phase 2: Enqueue ML tasks as background tasks (non-blocking)
        service_id = payload.service_id or payload.server_id
        background_tasks.add_task(run_anomaly_detection, service_id, payload.server_id)
        background_tasks.add_task(run_trend_analysis, service_id)

        return {"status": "ok", "inserted": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to insert metrics: {str(e)}")


@router.get("/{service_id}")
async def get_metrics(
    service_id: str,
    limit: int = Query(200, ge=1, le=1000),
    server_id: Optional[str] = Query(None),
):
    """
    Retrieve recent metrics for a given service.

    Returns time-series data ordered by timestamp (newest first).
    Used by the React dashboard Recharts components.
    """
    try:
        query = (
            supabase.table("metrics")
            .select("*")
            .eq("service_id", service_id)
        )

        if server_id:
            query = query.eq("server_id", server_id)

        result = (
            query
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )

        return {"data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch metrics: {str(e)}")
