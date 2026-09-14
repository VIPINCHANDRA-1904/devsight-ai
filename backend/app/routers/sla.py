"""
DEVSIGHTAI — SLA & SLO Monitoring Router (Phase 6)

Implements:
  - GET  /api/sla/            → System-wide SLA compliance overview
  - GET  /api/sla/{service_id}→ Live SLA/SLO evaluation for a specific service
  - PUT  /api/sla/{service_id}→ Configure custom availability, latency, and error targets
  - POST /api/sla/evaluate    → Force recalculate and check for SLA breach incidents
  - POST /api/sla/demo-seed   → Seed default SLA targets
"""

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

from app.core.supabase_client import supabase
from app.models.schemas import (
    SlaOverviewResponse,
    SlaStatusItem,
    SlaTargetResponse,
    SlaTargetUpdate,
)
from app.services.sla_engine import (
    DEFAULT_SLA_CONFIGS,
    evaluate_all_slas,
    evaluate_service_sla,
    get_service_sla_target,
)

logger = logging.getLogger("devsightai.sla")

router = APIRouter(prefix="/api/sla", tags=["SLA & SLO Monitoring"])


@router.get("/", response_model=SlaOverviewResponse)
async def get_sla_overview():
    """
    Get system-wide SLA compliance, error budgets, and health status across all services.
    """
    return evaluate_all_slas()


@router.get("/{service_id}", response_model=SlaStatusItem)
async def get_service_sla(service_id: str):
    """
    Get live SLA evaluation metrics and breach history for a specific service.
    """
    return evaluate_service_sla(service_id)


@router.put("/{service_id}", response_model=SlaTargetResponse)
async def update_service_sla_targets(service_id: str, payload: SlaTargetUpdate):
    """
    Update target availability, max latency, and error rate thresholds for a service.
    """
    now = datetime.now(timezone.utc).isoformat()
    record = {
        "service_id": service_id,
        "availability_target": payload.availability_target,
        "max_latency_ms": payload.max_latency_ms,
        "max_error_rate_pct": payload.max_error_rate_pct,
        "updated_at": now,
    }

    if service_id in DEFAULT_SLA_CONFIGS:
        DEFAULT_SLA_CONFIGS[service_id].update({
            "availability_target": payload.availability_target,
            "max_latency_ms": payload.max_latency_ms,
            "max_error_rate_pct": payload.max_error_rate_pct,
        })

    if supabase:
        try:
            res = (
                supabase.table("sla_targets")
                .upsert(record, on_conflict="service_id")
                .execute()
            )
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.error(f"Failed to persist SLA target to DB: {e}")

    return {
        "id": f"sla-{service_id}",
        **record,
    }


@router.post("/evaluate")
async def force_evaluate_sla():
    """
    Trigger live calculation across all services and check for breach events.
    """
    result = evaluate_all_slas()
    return {"status": "ok", "result": result}


@router.post("/demo-seed")
async def seed_demo_sla_targets():
    """
    Seed standard production SLA targets for all 5 monitored services.
    """
    seeded = 0
    now = datetime.now(timezone.utc).isoformat()

    for s_id, cfg in DEFAULT_SLA_CONFIGS.items():
        data = {
            "service_id": s_id,
            "availability_target": cfg["availability_target"],
            "max_latency_ms": cfg["max_latency_ms"],
            "max_error_rate_pct": cfg["max_error_rate_pct"],
            "updated_at": now,
        }
        if supabase:
            try:
                supabase.table("sla_targets").upsert(data, on_conflict="service_id").execute()
                seeded += 1
            except Exception as e:
                logger.debug(f"SLA seed error: {e}")
        else:
            seeded += 1

    return {"status": "ok", "seeded_targets": seeded}
