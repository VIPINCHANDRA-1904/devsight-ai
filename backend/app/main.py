"""
DEVSIGHTAI — FastAPI Application Entry Point

Central API server that:
- Receives telemetry from the psutil agent, instrumented apps, and CI/CD webhooks
- Serves processed data to the React dashboard
- Orchestrates ML anomaly detection and AI analysis (Phases 2–4)

Run with: uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    metrics,
    logs,
    events,
    deployments,
    anomalies,
    incidents,
    services,
    auth,
    sla,
    notifications,
    reports,
    demo,
)

# ──────────────────────────────────────────────
# Application
# ──────────────────────────────────────────────

app = FastAPI(
    title="DEVSIGHTAI API",
    description=(
        "AI-Powered Application Monitoring, Incident Intelligence "
        "and Reliability Platform"
    ),
    version="1.0.0",
)

# ──────────────────────────────────────────────
# CORS Middleware — configured to allow local dev
# and production Vercel frontend deployments
# ──────────────────────────────────────────────

cors_origins = [
    settings.FRONTEND_URL,
    settings.FRONTEND_URL.rstrip("/") if settings.FRONTEND_URL else None,
    "https://devsight-ai.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "https://devsightai-backend.onrender.com",
]
cors_origins = list(dict.fromkeys(o for o in cors_origins if o))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https:\/\/([a-zA-Z0-9_-]+\.)*(vercel\.app|onrender\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(metrics.router)
app.include_router(logs.router)
app.include_router(events.router)
app.include_router(deployments.router)
app.include_router(anomalies.router)
app.include_router(incidents.router)
app.include_router(services.router)
app.include_router(sla.router)
app.include_router(notifications.router)
app.include_router(reports.router)
app.include_router(demo.router)




# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "DEVSIGHTAI API",
        "version": "1.0.0",
    }


@app.get("/api/health", tags=["Health"])
async def api_health():
    """Detailed health check — verifies Supabase connectivity."""
    try:
        from app.core.supabase_client import supabase
        # Simple connectivity test — query the services table
        supabase.table("services").select("id").limit(1).execute()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "service": "DEVSIGHTAI API",
        "version": "1.0.0",
    }
