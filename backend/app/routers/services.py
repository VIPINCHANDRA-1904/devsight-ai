"""
DEVSIGHTAI — Services & Dependency Graph Router (Phase 3)

Provides service health topology and dependency graph for the D3 force-directed map:
  - GET  /api/services                  → List services with health & active incident counts
  - GET  /api/services/dependency-graph → Graph topology (nodes + edges) for D3
  - POST /api/services/seed-topology   → Populate default microservice architecture
"""

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException

from app.core.supabase_client import supabase

logger = logging.getLogger("devsightai.services")

router = APIRouter(prefix="/api/services", tags=["Services"])

# ──────────────────────────────────────────────
# Default Microservice Topology
# ──────────────────────────────────────────────
DEFAULT_NODES = [
    {
        "id": "api-gateway",
        "name": "API Gateway",
        "service_type": "gateway",
        "status": "healthy",
        "description": "Public ingress router, SSL termination & rate limiting",
        "active_incidents": 0,
        "max_severity": None,
    },
    {
        "id": "auth-service",
        "name": "Auth Service",
        "service_type": "application",
        "status": "healthy",
        "description": "OAuth2 / JWT token issuance & user session verification",
        "active_incidents": 0,
        "max_severity": None,
    },
    {
        "id": "order-service",
        "name": "Order Service",
        "service_type": "application",
        "status": "healthy",
        "description": "Order creation, checkout processing & order history",
        "active_incidents": 0,
        "max_severity": None,
    },
    {
        "id": "payment-service",
        "name": "Payment Service",
        "service_type": "application",
        "status": "degraded",
        "description": "Stripe/PayPal processor, card vaults & settlement queues",
        "active_incidents": 1,
        "max_severity": "CRITICAL",
    },
    {
        "id": "inventory-service",
        "name": "Inventory Service",
        "service_type": "application",
        "status": "healthy",
        "description": "SKU catalog tracking, stock reservations & warehouse sync",
        "active_incidents": 0,
        "max_severity": None,
    },
    {
        "id": "payment-db",
        "name": "Payment DB (PostgreSQL)",
        "service_type": "database",
        "status": "degraded",
        "description": "High-durability ACID store for ledger and payment records",
        "active_incidents": 0,
        "max_severity": None,
    },
    {
        "id": "order-db",
        "name": "Order DB (PostgreSQL)",
        "service_type": "database",
        "status": "healthy",
        "description": "Primary transactional storage for customers and orders",
        "active_incidents": 0,
        "max_severity": None,
    },
    {
        "id": "redis-cache",
        "name": "Redis Session Cache",
        "service_type": "cache",
        "status": "healthy",
        "description": "In-memory distributed key-value cache for auth tokens",
        "active_incidents": 0,
        "max_severity": None,
    },
]

DEFAULT_EDGES = [
    {"source": "api-gateway", "target": "auth-service", "dependency_type": "calls"},
    {"source": "api-gateway", "target": "order-service", "dependency_type": "calls"},
    {"source": "api-gateway", "target": "payment-service", "dependency_type": "calls"},
    {"source": "auth-service", "target": "redis-cache", "dependency_type": "reads"},
    {"source": "order-service", "target": "payment-service", "dependency_type": "calls"},
    {"source": "order-service", "target": "inventory-service", "dependency_type": "calls"},
    {"source": "order-service", "target": "order-db", "dependency_type": "writes"},
    {"source": "payment-service", "target": "payment-db", "dependency_type": "writes"},
]


def _overlay_active_incidents(nodes: list[dict]) -> list[dict]:
    """Overlay live incident status from incidents table onto service nodes."""
    if not supabase:
        return nodes

    try:
        incidents_res = (
            supabase.table("incidents")
            .select("service_id, severity, status")
            .neq("status", "resolved")
            .execute()
        )
        active_incidents = incidents_res.data or []

        # Aggregate by service_id
        service_incidents: dict[str, list[dict]] = {}
        for inc in active_incidents:
            s_id = inc.get("service_id")
            if s_id:
                service_incidents.setdefault(s_id, []).append(inc)

        updated_nodes = []
        for node in nodes:
            n = dict(node)
            s_id = n["id"]
            if s_id in service_incidents:
                incs = service_incidents[s_id]
                n["active_incidents"] = len(incs)
                # Find highest severity
                severities = [i.get("severity", "MEDIUM") for i in incs]
                if "CRITICAL" in severities:
                    n["max_severity"] = "CRITICAL"
                    n["status"] = "critical"
                elif "HIGH" in severities:
                    n["max_severity"] = "HIGH"
                    n["status"] = "degraded"
                else:
                    n["max_severity"] = "MEDIUM"
                    n["status"] = "degraded"
            else:
                n["active_incidents"] = 0
                n["max_severity"] = None
                if n["status"] in ("critical", "degraded"):
                    n["status"] = "healthy"
            updated_nodes.append(n)

        return updated_nodes
    except Exception as e:
        logger.debug(f"Could not overlay live incidents on service graph: {e}")
        return nodes


@router.get("/")
async def list_services():
    """
    List all registered services, their current health status, and active incident counts.
    """
    if not supabase:
        return _overlay_active_incidents(DEFAULT_NODES)

    try:
        res = supabase.table("services").select("*").execute()
        services = res.data or []
        if not services:
            return _overlay_active_incidents(DEFAULT_NODES)

        # Format services to standard schema
        formatted = []
        for s in services:
            formatted.append({
                "id": s.get("name") or str(s.get("id")),
                "name": s.get("name", "").replace("-", " ").title(),
                "service_type": s.get("service_type", "application"),
                "status": s.get("status", "healthy"),
                "description": s.get("description", ""),
                "active_incidents": 0,
                "max_severity": None,
            })

        return _overlay_active_incidents(formatted)
    except Exception as e:
        logger.error(f"Failed to fetch services: {e}")
        return _overlay_active_incidents(DEFAULT_NODES)


@router.get("/dependency-graph")
async def get_dependency_graph():
    """
    Returns the complete microservice dependency graph (nodes + edges) for D3 force-directed rendering.
    Dynamically highlights affected services and cascade propagation paths.
    """
    nodes = list(DEFAULT_NODES)
    edges = list(DEFAULT_EDGES)

    if supabase:
        try:
            # Query services table
            services_res = supabase.table("services").select("*").execute()
            if services_res.data and len(services_res.data) > 0:
                nodes = [
                    {
                        "id": s.get("name") or str(s.get("id")),
                        "name": s.get("name", "").replace("-", " ").title(),
                        "service_type": s.get("service_type", "application"),
                        "status": s.get("status", "healthy"),
                        "description": s.get("description", ""),
                        "active_incidents": 0,
                        "max_severity": None,
                    }
                    for s in services_res.data
                ]

            # Query service_dependencies table
            deps_res = supabase.table("service_dependencies").select("*").execute()
            if deps_res.data and len(deps_res.data) > 0:
                edges = [
                    {
                        "source": d.get("source_service_id"),
                        "target": d.get("target_service_id"),
                        "dependency_type": d.get("dependency_type", "calls"),
                    }
                    for d in deps_res.data
                ]
        except Exception as e:
            logger.debug(f"Using default dependency graph topology: {e}")

    # Overlay live incident status onto graph nodes
    nodes = _overlay_active_incidents(nodes)

    return {
        "nodes": nodes,
        "edges": edges,
    }


@router.post("/seed-topology")
async def seed_topology():
    """
    Seeds default microservices and dependencies into Supabase for testing.
    """
    if not supabase:
        return {"status": "ok", "message": "Supabase not configured, using in-memory topology"}

    try:
        # Check if services already exist
        existing = supabase.table("services").select("id, name").execute()
        if existing.data and len(existing.data) >= len(DEFAULT_NODES):
            return {"status": "already_seeded", "count": len(existing.data)}

        # Insert services
        service_map = {}
        for n in DEFAULT_NODES:
            s_data = {
                "name": n["id"],
                "description": n["description"],
                "service_type": n["service_type"],
                "status": n["status"],
            }
            res = supabase.table("services").upsert(s_data, on_conflict="name").execute()
            if res.data:
                service_map[n["id"]] = res.data[0]["id"]

        # Insert dependencies
        for edge in DEFAULT_EDGES:
            src_uuid = service_map.get(edge["source"])
            tgt_uuid = service_map.get(edge["target"])
            if src_uuid and tgt_uuid:
                supabase.table("service_dependencies").upsert(
                    {
                        "source_service_id": src_uuid,
                        "target_service_id": tgt_uuid,
                        "dependency_type": edge["dependency_type"],
                    },
                    on_conflict="source_service_id,target_service_id",
                ).execute()

        return {"status": "ok", "seeded_services": len(service_map)}
    except Exception as e:
        logger.error(f"Failed to seed topology: {e}")
        raise HTTPException(status_code=500, detail=str(e))
