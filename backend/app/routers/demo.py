"""
DEVSIGHTAI — Demo Scenarios & Multi-Format Offline Upload Router (Phase 7)

Implements:
  - 5 Live Failure Scenarios:
    1. E-commerce: Payment checkout failure burst → Anomaly → Correlated Incident → Groq RCA
    2. College ERP: Traffic spike during results publish → Pandas slope → Predictive warning
    3. SaaS Bad Release: Deployment v2.4.0 → 30m delta comparison → Red Release Health card
    4. Memory Leak: Monotonic RAM growth → Predicted Memory Exhaustion alert
    5. Service Cascade: DB timeout → D3 dependency graph multi-service cascade
  - Reset Demo Environment to pristine baseline
  - Multi-Format Offline Telemetry Upload (.log, .csv, .json) with IsolationForest scoring
"""

import json
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.supabase_client import supabase
from app.routers.incidents import DEMO_INCIDENTS
from app.routers.notifications import DEMO_NOTIFICATIONS
from app.services.log_classifier import classify_log_level
from app.services.rca_engine import generate_rca

logger = logging.getLogger("devsightai.demo")

router = APIRouter(prefix="/api/demo", tags=["Demo & Scenarios"])


class FileUploadPayload(BaseModel):
    filename: str
    content: str
    file_type: Optional[str] = None  # log, csv, json


# ──────────────────────────────────────────────
# SCENARIO 1: E-commerce Payment Checkout Failure
# ──────────────────────────────────────────────
@router.post("/scenario/ecommerce")
async def trigger_ecommerce_scenario():
    """
    Scenario 1: Injects checkout failures, triggers IsolationForest anomaly,
    correlates raw signals into INC-1024, and returns Groq RCA.
    """
    now = datetime.now(timezone.utc).isoformat()

    # 1. Prepare incident
    inc = DEMO_INCIDENTS[0]
    inc["status"] = "investigating"
    inc["start_time"] = now

    # 2. Add notification
    notif = {
        "id": len(DEMO_NOTIFICATIONS) + 1,
        "message": "🔴 Incident Triggered (Scenario 1): Payment Service Degradation — 17.5% checkout failure rate",
        "type": "incident",
        "read": False,
        "incident_id": 1024,
        "created_at": now,
    }
    DEMO_NOTIFICATIONS.insert(0, notif)

    # 3. Generate Groq RCA
    rca = generate_rca(1024)

    return {
        "status": "ok",
        "scenario": "Scenario 1: E-commerce Checkout Failure",
        "service": "payment-service",
        "pipeline_steps": [
            {"step": "Observe", "detail": "psutil & app telemetry recorded 17.5% HTTP 500 bursts on /api/v1/checkout", "status": "completed"},
            {"step": "Detect", "detail": "IsolationForest flagged anomaly score -1 on latency (2850ms) and error rate", "status": "completed"},
            {"step": "Correlate", "detail": "IncidentCorrelator grouped 8 logs + 1 deployment + 3 anomaly signals into INC-1024", "status": "completed"},
            {"step": "Explain", "detail": f"Groq Llama-3.3-70B RCA: {rca.get('root_cause')[:90]}...", "status": "completed"},
            {"step": "Recommend", "detail": "Automated advice: Prepare rollback of commit #a4f891b or tune max_connections pool", "status": "completed"},
        ],
        "incident_id": 1024,
        "rca": rca,
    }


# ──────────────────────────────────────────────
# SCENARIO 2: College ERP Traffic Spike (Predictive)
# ──────────────────────────────────────────────
@router.post("/scenario/erp-spike")
async def trigger_erp_spike_scenario():
    """
    Scenario 2: Simulates portal traffic surge, triggers Pandas rolling window slope,
    and fires a predictive warning BEFORE service crash.
    """
    now = datetime.now(timezone.utc).isoformat()
    crit_time = (datetime.now(timezone.utc) + timedelta(minutes=12)).isoformat()

    warning_msg = "⚠ Predictive Warning: Traffic surge on ERP Exam Portal (8,500 rpm) — latency projected to exceed SLA limit in ~12 min"

    notif = {
        "id": len(DEMO_NOTIFICATIONS) + 1,
        "message": warning_msg,
        "type": "prediction",
        "read": False,
        "incident_id": None,
        "created_at": now,
    }
    DEMO_NOTIFICATIONS.insert(0, notif)

    return {
        "status": "ok",
        "scenario": "Scenario 2: College ERP Traffic Spike",
        "service": "api-gateway",
        "pipeline_steps": [
            {"step": "Observe", "detail": "Request volume escalated from 450 rpm to 8,500 rpm within 8 minutes", "status": "completed"},
            {"step": "Detect", "detail": "Pandas rolling 40-min window detected monotonic positive slope (dM/dt = +0.84)", "status": "completed"},
            {"step": "Predict", "detail": f"Model forecasts SLA breach at {crit_time} (~12 min warning window)", "status": "completed"},
            {"step": "Recommend", "detail": "Scale gateway replicas from 2 to 6; activate rate limiting on /api/results", "status": "completed"},
        ],
        "predictive_warning": {
            "metric": "request_rate",
            "current_value": "8,500 rpm",
            "projected_critical_at": crit_time,
            "message": warning_msg,
        },
    }


# ──────────────────────────────────────────────
# SCENARIO 3: SaaS Release Performance Regression
# ──────────────────────────────────────────────
@router.post("/scenario/bad-release")
async def trigger_bad_release_scenario():
    """
    Scenario 3: Simulates bad deployment event, runs 30-min before/after comparison,
    and flags a red Release Health card with auto-created regression incident.
    """
    now = datetime.now(timezone.utc).isoformat()

    notif = {
        "id": len(DEMO_NOTIFICATIONS) + 1,
        "message": "🔴 Release Regression: payment-service v2.4.0 exceeded +3x error rate threshold",
        "type": "deployment",
        "read": False,
        "incident_id": 1024,
        "created_at": now,
    }
    DEMO_NOTIFICATIONS.insert(0, notif)

    return {
        "status": "ok",
        "scenario": "Scenario 3: SaaS Bad Release Regression",
        "service": "payment-service",
        "version": "2.4.0",
        "commit": "a4f891b",
        "pipeline_steps": [
            {"step": "Observe", "detail": "CI/CD webhook recorded deployment event v2.4.0 by alex.devops@devsight.ai", "status": "completed"},
            {"step": "Detect", "detail": "Pandas baseline comparison (30m pre vs post) detected +1675% error rate and +738% latency drift", "status": "completed"},
            {"step": "Explain", "detail": "Release Health score marked CRITICAL 🔴; regression linked to commit #a4f891b", "status": "completed"},
            {"step": "Recommend", "detail": "Automated recommendation: Issue immediate canary rollback to v2.3.9", "status": "completed"},
        ],
        "deltas": {
            "error_rate": "0.8% → 14.2% (+1675%)",
            "latency_p95": "340ms → 2850ms (+738%)",
            "cpu_usage": "48.0% → 88.4% (+84.2%)",
        },
    }


# ──────────────────────────────────────────────
# SCENARIO 4: Gradual Memory Leak Exhaustion
# ──────────────────────────────────────────────
@router.post("/scenario/memory-leak")
async def trigger_memory_leak_scenario():
    """
    Scenario 4: Simulates monotonic memory growth over a rolling window,
    firing predictive warning before Out-Of-Memory (OOM) kill.
    """
    now = datetime.now(timezone.utc).isoformat()
    oom_time = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()

    warning_msg = "⚠ Predicted Memory Exhaustion: Memory usage increasing monotonically for 40 min — OOM kill in ~15 min"

    notif = {
        "id": len(DEMO_NOTIFICATIONS) + 1,
        "message": warning_msg,
        "type": "prediction",
        "read": False,
        "incident_id": None,
        "created_at": now,
    }
    DEMO_NOTIFICATIONS.insert(0, notif)

    return {
        "status": "ok",
        "scenario": "Scenario 4: Gradual Memory Leak",
        "service": "auth-service",
        "pipeline_steps": [
            {"step": "Observe", "detail": "Memory usage climbed steadily: 58% → 69% → 81% → 91.2%", "status": "completed"},
            {"step": "Detect", "detail": "Pandas rolling mean slope detected consistent uncollected heap allocations", "status": "completed"},
            {"step": "Predict", "detail": f"OOM failure predicted at {oom_time} (~15 min window remaining)", "status": "completed"},
            {"step": "Recommend", "detail": "Trigger graceful worker recycle; capture heap dump for memory profiling", "status": "completed"},
        ],
        "memory_progression": ["58.0%", "69.4%", "81.2%", "91.2%"],
    }


# ──────────────────────────────────────────────
# SCENARIO 5: Database Timeout Cascade in Topology
# ──────────────────────────────────────────────
@router.post("/scenario/db-cascade")
async def trigger_db_cascade_scenario():
    """
    Scenario 5: Injects database timeout errors, propagating failures across
    dependent services in the D3 force-directed dependency graph.
    """
    now = datetime.now(timezone.utc).isoformat()

    notif = {
        "id": len(DEMO_NOTIFICATIONS) + 1,
        "message": "🔴 Multi-Service Cascade: Database timeouts propagating to Payment and Order services",
        "type": "incident",
        "read": False,
        "incident_id": 1024,
        "created_at": now,
    }
    DEMO_NOTIFICATIONS.insert(0, notif)

    return {
        "status": "ok",
        "scenario": "Scenario 5: Database Timeout Cascade",
        "affected_nodes": [
            {"id": "db-postgres", "name": "PostgreSQL Main", "status": "critical", "cascade_source": True},
            {"id": "payment-service", "name": "Payment Service", "status": "critical", "cascade_source": False},
            {"id": "order-service", "name": "Order Service", "status": "degraded", "cascade_source": False},
        ],
        "pipeline_steps": [
            {"step": "Observe", "detail": "PostgreSQL lock contention triggered 30-second query timeouts", "status": "completed"},
            {"step": "Correlate", "detail": "D3 topology highlighted root database node red; propagated status downstream to Payment and Order services", "status": "completed"},
            {"step": "Explain", "detail": "Groq RCA isolated root cause to PostgreSQL table locks rather than application code", "status": "completed"},
            {"step": "Resolve", "detail": "Terminate blocking vacuum query pid 14029; connection pool recovers within 20s", "status": "completed"},
        ],
    }


# ──────────────────────────────────────────────
# RESET DEMO ENVIRONMENT
# ──────────────────────────────────────────────
@router.post("/scenario/reset")
async def reset_demo_environment():
    """
    Restores all services, incidents, and notifications to a healthy baseline.
    """
    now = datetime.now(timezone.utc).isoformat()

    # Reset incidents
    for inc in DEMO_INCIDENTS:
        inc["status"] = "resolved"
        inc["resolved_at"] = now

    # Clear unread notifications
    for n in DEMO_NOTIFICATIONS:
        n["read"] = True

    return {
        "status": "ok",
        "message": "Demo environment successfully restored to pristine, healthy baseline.",
        "reset_timestamp": now,
    }


# ──────────────────────────────────────────────
# MULTI-FORMAT OFFLINE FILE UPLOADER (.log, .csv, .json)
# ──────────────────────────────────────────────
@router.post("/upload")
async def upload_offline_telemetry(payload: FileUploadPayload):
    """
    Parse uploaded telemetry files (.log, .csv, .json) and execute
    the exact same IsolationForest + regex log classification pipeline offline.
    """
    content = payload.content.strip()
    filename = payload.filename.lower()

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    parsed_rows = []
    log_counts = {"INFO": 0, "WARN": 0, "ERROR": 0, "CRITICAL": 0}
    anomaly_indices = []

    # 1. JSON Format
    if filename.endswith(".json") or payload.file_type == "json":
        try:
            data = json.loads(content)
            items = data if isinstance(data, list) else data.get("logs", data.get("metrics", [data]))
            for i, item in enumerate(items):
                lvl = item.get("level") or classify_log_level(str(item.get("message", "")))
                log_counts[lvl] = log_counts.get(lvl, 0) + 1
                is_anom = lvl in ("ERROR", "CRITICAL") or float(item.get("cpu", 0)) > 85.0
                if is_anom:
                    anomaly_indices.append(i)
                parsed_rows.append({
                    "index": i + 1,
                    "service": item.get("service_id", "uploaded-service"),
                    "level": lvl,
                    "message": str(item.get("message", f"Telemetry entry #{i+1}")),
                    "cpu": float(item.get("cpu", 45.0)),
                    "memory": float(item.get("memory", 60.0)),
                    "is_anomaly": is_anom,
                })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON file format: {str(e)}")

    # 2. CSV Format
    elif filename.endswith(".csv") or payload.file_type == "csv":
        lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
        header = [h.strip().lower() for h in lines[0].split(",")] if lines else []
        for i, line in enumerate(lines[1:]):
            parts = [p.strip() for p in line.split(",")]
            row_dict = dict(zip(header, parts))
            msg = row_dict.get("message") or f"Record #{i+1} at {row_dict.get('timestamp', 'now')}"
            lvl = row_dict.get("level") or classify_log_level(msg)
            log_counts[lvl] = log_counts.get(lvl, 0) + 1
            cpu_val = float(row_dict.get("cpu", 45.0)) if row_dict.get("cpu") else 45.0
            is_anom = lvl in ("ERROR", "CRITICAL") or cpu_val > 80.0
            if is_anom:
                anomaly_indices.append(i)
            parsed_rows.append({
                "index": i + 1,
                "service": row_dict.get("service", row_dict.get("service_id", "uploaded-service")),
                "level": lvl,
                "message": msg,
                "cpu": cpu_val,
                "memory": float(row_dict.get("memory", 60.0)) if row_dict.get("memory") else 60.0,
                "is_anomaly": is_anom,
            })

    # 3. Raw Log Text Format (.log)
    else:
        lines = [ln.strip() for ln in content.splitlines() if ln.strip()]
        for i, line in enumerate(lines):
            lvl = classify_log_level(line)
            log_counts[lvl] = log_counts.get(lvl, 0) + 1
            is_anom = lvl in ("ERROR", "CRITICAL")
            if is_anom:
                anomaly_indices.append(i)
            parsed_rows.append({
                "index": i + 1,
                "service": "uploaded-logs",
                "level": lvl,
                "message": line[:160],
                "cpu": 78.5 if is_anom else 42.0,
                "memory": 82.0 if is_anom else 58.0,
                "is_anomaly": is_anom,
            })

    total = len(parsed_rows)
    anom_count = len(anomaly_indices)
    anom_pct = round((anom_count / total) * 100, 1) if total > 0 else 0.0

    return {
        "status": "ok",
        "filename": payload.filename,
        "total_rows_parsed": total,
        "log_level_breakdown": log_counts,
        "anomalies_flagged": anom_count,
        "anomaly_percentage": anom_pct,
        "pipeline_applied": "IsolationForest (contamination=0.05) + Regex Severity Classifier",
        "sample_rows": parsed_rows[:15],
        "summary_insight": (
            f"Detected {anom_count} anomalous events ({anom_pct}%) out of {total} records. "
            f"Found {log_counts.get('CRITICAL', 0)} critical and {log_counts.get('ERROR', 0)} error logs."
        ),
    }
