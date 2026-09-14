"""
DEVSIGHTAI — Deployments & Release Intelligence Router (Phase 5)

Full release management and performance regression detection:
  - POST /api/deployments/                    → Record deployment + background health evaluation
  - GET  /api/deployments/                    → Query deployment history with Release Health status
  - GET  /api/deployments/latest/{service_id} → Get latest deployment for a service
  - GET  /api/deployments/{id}/health         → Before/After metric comparisons & regression analysis
  - GET  /api/deployments/health/recent       → Summary evaluations across all recent deployments
  - POST /api/deployments/demo-seed           → Seed realistic demo deployments
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.core.supabase_client import supabase
from app.models.schemas import DeploymentPayload
from app.services.release_analyzer import evaluate_deployment_health

logger = logging.getLogger("devsightai.deployments")

router = APIRouter(prefix="/api/deployments", tags=["Deployments"])

# ──────────────────────────────────────────────
# Demo Deployments (Fallback for local/demo mode)
# ──────────────────────────────────────────────
DEMO_DEPLOYMENTS = [
    {
        "id": "d1-2024-v2-4",
        "service_id": "payment-service",
        "version": "2.4.0",
        "environment": "production",
        "deployed_at": "2026-09-14T10:22:00Z",
        "deployed_by": "alex.devops@devsight.ai",
        "commit_hash": "a4f891b",
        "description": "Bump max_connections and optimize webhook parsing",
    },
    {
        "id": "d0-2024-v2-3",
        "service_id": "payment-service",
        "version": "2.3.9",
        "environment": "production",
        "deployed_at": "2026-09-12T14:00:00Z",
        "deployed_by": "ci-runner@github-actions",
        "commit_hash": "83c17fa",
        "description": "Stable production release with circuit breaker telemetry",
    },
    {
        "id": "d2-2024-v1-8",
        "service_id": "order-service",
        "version": "1.8.2",
        "environment": "production",
        "deployed_at": "2026-09-14T08:30:00Z",
        "deployed_by": "david.backend@devsight.ai",
        "commit_hash": "f92b451",
        "description": "Add idempotency keys to checkout API endpoint",
    },
    {
        "id": "d3-2024-v3-1",
        "service_id": "api-gateway",
        "version": "3.1.0",
        "environment": "production",
        "deployed_at": "2026-09-13T11:00:00Z",
        "deployed_by": "sarah.infra@devsight.ai",
        "commit_hash": "31a0e94",
        "description": "Upgrade Envoy proxy runtime and tune buffer sizes",
    },
]


@router.post("/", status_code=201)
async def record_deployment(payload: DeploymentPayload, background_tasks: BackgroundTasks):
    """
    Record a deployment event and automatically trigger before/after health evaluation in the background.
    """
    now = datetime.now(timezone.utc)
    dep_id = str(uuid.uuid4())
    data = {
        "service_id": payload.service_id,
        "version": payload.version,
        "environment": payload.environment,
        "deployed_at": payload.deployed_at.isoformat() if payload.deployed_at else now.isoformat(),
        "deployed_by": payload.deployed_by or "ci-runner",
        "commit_hash": payload.commit_hash or uuid.uuid4().hex[:7],
        "description": payload.description or "Automated release deployment",
    }

    if not supabase:
        # Add to demo array in-memory
        demo_record = {"id": dep_id, **data}
        DEMO_DEPLOYMENTS.insert(0, demo_record)
        return {"status": "ok", "deployment": demo_record}

    try:
        result = supabase.table("deployments").insert(data).execute()
        if result.data:
            created_dep = result.data[0]
            # Trigger Phase 5 Release Health Evaluation as a BackgroundTask
            background_tasks.add_task(
                evaluate_deployment_health,
                str(created_dep.get("id")),
                payload.service_id,
                data["deployed_at"],
                payload.version,
            )
            return {"status": "ok", "deployment": created_dep}
        return {"status": "ok", "inserted": 1}
    except Exception as e:
        logger.error(f"Failed to record deployment: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to record deployment: {str(e)}")


@router.get("/")
async def get_deployments(
    service_id: Optional[str] = Query(None, description="Filter by service"),
    environment: Optional[str] = Query(None, description="Filter by environment"),
    limit: int = Query(50, ge=1, le=200),
):
    """
    Query deployment history with attached Release Health status badges.
    """
    deployments = list(DEMO_DEPLOYMENTS)

    if supabase:
        try:
            query = supabase.table("deployments").select("*")
            if service_id:
                query = query.eq("service_id", service_id)
            if environment:
                query = query.eq("environment", environment)

            result = query.order("deployed_at", desc=True).limit(limit).execute()
            if result.data and len(result.data) > 0:
                deployments = result.data
        except Exception as e:
            logger.debug(f"Could not query deployments from DB: {e}")

    # Attach Release Health status to each deployment
    enriched = []
    for dep in deployments:
        s_id = dep.get("service_id")
        if service_id and s_id != service_id:
            continue
        if environment and dep.get("environment") != environment:
            continue

        d_id = str(dep.get("id"))
        health = evaluate_deployment_health(
            deployment_id=d_id,
            service_id=s_id,
            deployed_at=dep.get("deployed_at"),
            version=dep.get("version"),
        )
        enriched.append({
            **dep,
            "release_health": health,
        })

    return {"data": enriched[:limit]}


@router.get("/latest/{service_id}")
async def get_latest_deployment(service_id: str):
    """
    Get the most recent deployment for a specific service.
    """
    if not supabase:
        matches = [d for d in DEMO_DEPLOYMENTS if d["service_id"] == service_id]
        return {"data": matches[0] if matches else None}

    try:
        result = (
            supabase.table("deployments")
            .select("*")
            .eq("service_id", service_id)
            .order("deployed_at", desc=True)
            .limit(1)
            .execute()
        )
        if not result.data:
            matches = [d for d in DEMO_DEPLOYMENTS if d["service_id"] == service_id]
            return {"data": matches[0] if matches else None}

        return {"data": result.data[0]}
    except Exception as e:
        logger.error(f"Failed to fetch latest deployment: {e}")
        return {"data": None}


@router.get("/{deployment_id}/health")
async def get_single_deployment_health(deployment_id: str):
    """
    Retrieve before/after metric comparison and regression assessment for a deployment.
    """
    service_id = "payment-service"
    version = "2.4.0"
    deployed_at = None

    if supabase:
        try:
            dep_res = supabase.table("deployments").select("*").eq("id", deployment_id).execute()
            if dep_res.data:
                d = dep_res.data[0]
                service_id = d.get("service_id", service_id)
                version = d.get("version", version)
                deployed_at = d.get("deployed_at")
        except Exception as e:
            logger.debug(f"Could not load deployment record: {e}")

    health = evaluate_deployment_health(
        deployment_id=deployment_id,
        service_id=service_id,
        deployed_at=deployed_at,
        version=version,
    )
    return health


@router.get("/health/recent")
async def get_recent_release_health():
    """
    Returns summary Release Health status across recent deployments.
    """
    deployments = DEMO_DEPLOYMENTS[:5]
    if supabase:
        try:
            res = supabase.table("deployments").select("*").order("deployed_at", desc=True).limit(5).execute()
            if res.data:
                deployments = res.data
        except Exception:
            pass

    evaluations = []
    for dep in deployments:
        evaluations.append(
            evaluate_deployment_health(
                deployment_id=str(dep.get("id")),
                service_id=dep.get("service_id"),
                deployed_at=dep.get("deployed_at"),
                version=dep.get("version"),
            )
        )

    return {"data": evaluations}


@router.post("/demo-seed")
async def seed_demo_deployments():
    """
    Seed realistic demonstration deployments into the database.
    """
    if not supabase:
        return {"status": "ok", "seeded": len(DEMO_DEPLOYMENTS)}

    try:
        inserted = 0
        for d in DEMO_DEPLOYMENTS:
            res = supabase.table("deployments").upsert(d, on_conflict="id").execute()
            if res.data:
                inserted += 1
        return {"status": "ok", "seeded": inserted}
    except Exception as e:
        logger.error(f"Failed to seed demo deployments: {e}")
        return {"status": "error", "detail": str(e)}
