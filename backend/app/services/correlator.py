"""
DEVSIGHTAI — Incident Correlation Engine

Correlates raw signals across the stack into unified, actionable incidents:
  - IsolationForest anomalies (Phase 2)
  - Error and critical log bursts
  - CI/CD deployment events
  - Database and connection timeouts

Alert Storm Prevention:
  - Re-evaluates active incidents to group recurring signals
  - Deduplicates multiple alerts into one ongoing incident

Historical Matching:
  - Compares error tokens with past resolved incidents
  - Attaches similar incidents to aid RCA (Phase 4)
"""

import logging
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.core.supabase_client import supabase

logger = logging.getLogger("devsightai.correlator")

# Correlation sliding window
WINDOW_MINUTES = 15
SUB_WINDOW_ERROR_MINUTES = 5
COOLDOWN_ACTIVE_INCIDENT_MINUTES = 30

# High-risk log keywords indicating database, pool, or infrastructure failure
CRITICAL_LOG_PATTERNS = [
    r"timeout",
    r"timed\s*out",
    r"connection\s*refused",
    r"connection\s*pool",
    r"deadlock",
    r"out\s*of\s*memory",
    r"oom",
    r"database\s*error",
    r"504\s*gateway",
    r"500\s*internal",
    r"broken\s*pipe",
]


def correlate_incident(service_id: str) -> Optional[dict]:
    """
    Run multi-signal correlation for a given service.

    Triggered as a FastAPI BackgroundTask by anomaly_detector.py,
    or invoked manually via /api/incidents/correlate.
    """
    if not service_id:
        return None

    if not supabase:
        logger.warning(f"Supabase not configured - skipping correlation for {service_id}")
        return None

    try:
        return _run_correlation(service_id)
    except Exception as e:
        logger.error(f"Correlation failed for service {service_id}: {e}", exc_info=True)
        return None


def _run_correlation(service_id: str) -> Optional[dict]:
    """Internal correlation logic with scoring and deduplication."""
    now = datetime.now(timezone.utc)
    cutoff_15m = (now - timedelta(minutes=WINDOW_MINUTES)).isoformat()
    cutoff_5m = (now - timedelta(minutes=SUB_WINDOW_ERROR_MINUTES)).isoformat()
    cutoff_30m = (now - timedelta(minutes=COOLDOWN_ACTIVE_INCIDENT_MINUTES)).isoformat()

    # 1. Fetch recent anomalies (last 15m)
    anomalies_res = (
        supabase.table("anomalies")
        .select("id, anomaly_score, metric_snapshot, detected_at, processed")
        .eq("service_id", service_id)
        .gte("detected_at", cutoff_15m)
        .order("detected_at", desc=True)
        .limit(20)
        .execute()
    )
    anomalies = anomalies_res.data or []

    # 2. Fetch recent ERROR and CRITICAL logs (last 15m)
    logs_res = (
        supabase.table("logs")
        .select("id, message, level, timestamp, source")
        .eq("service_id", service_id)
        .in_("level", ["ERROR", "CRITICAL"])
        .gte("timestamp", cutoff_15m)
        .order("timestamp", desc=True)
        .limit(50)
        .execute()
    )
    error_logs = logs_res.data or []

    # 3. Fetch recent deployments (last 30m)
    deployments_res = (
        supabase.table("deployments")
        .select("id, version, deployed_at, deployed_by, commit_hash, description")
        .eq("service_id", service_id)
        .gte("deployed_at", cutoff_30m)
        .order("deployed_at", desc=True)
        .limit(5)
        .execute()
    )
    deployments = deployments_res.data or []

    # ──────────────────────────────────────────────
    # Correlation Scoring
    # ──────────────────────────────────────────────
    score = 0
    score_reasons = []

    # Signal 1: Anomaly detected (1 pt)
    if anomalies:
        score += 1
        score_reasons.append(f"Anomaly detected ({len(anomalies)} events in 15m)")

    # Signal 2: Recent ERROR logs in last 5m (+2 pts, or +3 pts if heavy burst)
    recent_5m_logs = [log for log in error_logs if log.get("timestamp", "") >= cutoff_5m]
    if len(recent_5m_logs) >= 5:
        score += 3
        score_reasons.append(f"Heavy error burst ({len(recent_5m_logs)} errors in last 5m)")
    elif len(recent_5m_logs) >= 1:
        score += 2
        score_reasons.append(f"Error logs detected ({len(recent_5m_logs)} errors in last 5m)")

    # Signal 3: Recent deployment (+3 pts)
    recent_deployment = None
    if deployments:
        # Check if deployed within 15 min
        recent_deploys_15m = [
            d for d in deployments if d.get("deployed_at", "") >= cutoff_15m
        ]
        if recent_deploys_15m:
            score += 3
            recent_deployment = recent_deploys_15m[0]
            score_reasons.append(f"Recent deployment (v{recent_deployment.get('version')} deployed <15m ago)")
        else:
            # Deployment in 15-30m window
            score += 1
            recent_deployment = deployments[0]
            score_reasons.append(f"Deployment in last 30m (v{recent_deployment.get('version')})")

    # Signal 4: Database / timeout / resource exhaustion errors (+2 pts)
    matched_critical_patterns = set()
    for log in error_logs:
        msg = log.get("message", "").lower()
        for pat in CRITICAL_LOG_PATTERNS:
            if re.search(pat, msg):
                matched_critical_patterns.add(pat)

    if matched_critical_patterns:
        score += 2
        score_reasons.append(f"Critical error keywords matched: {', '.join(list(matched_critical_patterns)[:3])}")

    logger.info(
        f"Correlation evaluation for {service_id}: Score={score} (Threshold=4). "
        f"Reasons: {'; '.join(score_reasons) if score_reasons else 'None'}"
    )

    # ──────────────────────────────────────────────
    # Threshold Check: Score < 4 does not trigger incident
    # ──────────────────────────────────────────────
    if score < 4:
        logger.debug(f"Correlation score {score} < 4 for {service_id} — alert suppressed")
        return None

    # Determine severity
    if score >= 7:
        severity = "CRITICAL"
    elif score >= 5:
        severity = "HIGH"
    else:
        severity = "MEDIUM"

    # Extract affected metrics snapshot
    affected_metrics: dict[str, Any] = {}
    if anomalies and anomalies[0].get("metric_snapshot"):
        affected_metrics = anomalies[0]["metric_snapshot"]
    else:
        # Fallback to querying latest metric for this service
        latest_m = (
            supabase.table("metrics")
            .select("cpu, memory, disk, network_sent_mb, network_recv_mb, timestamp")
            .eq("service_id", service_id)
            .order("timestamp", desc=True)
            .limit(1)
            .execute()
        )
        if latest_m.data:
            affected_metrics = latest_m.data[0]

    correlated_log_ids = [log["id"] for log in error_logs[:20]]
    correlated_deployment_id = recent_deployment["id"] if recent_deployment else None

    # ──────────────────────────────────────────────
    # Alert Storm Prevention: Check for Active Incident
    # ──────────────────────────────────────────────
    active_incidents_res = (
        supabase.table("incidents")
        .select("id, title, correlation_score, correlated_log_ids, affected_metrics, severity")
        .eq("service_id", service_id)
        .neq("status", "resolved")
        .gte("start_time", cutoff_30m)
        .order("start_time", desc=True)
        .limit(1)
        .execute()
    )

    if active_incidents_res.data:
        # Existing open incident found — update it rather than spamming a new one!
        existing = active_incidents_res.data[0]
        existing_id = existing["id"]

        merged_log_ids = list(set(existing.get("correlated_log_ids", []) + correlated_log_ids))
        updated_score = max(existing.get("correlation_score", 0), score)

        update_payload: dict[str, Any] = {
            "correlation_score": updated_score,
            "correlated_log_ids": merged_log_ids[:50],
            "updated_at": now.isoformat(),
        }

        # Escalate severity if score increased
        if score > existing.get("correlation_score", 0):
            update_payload["severity"] = severity
        if affected_metrics:
            update_payload["affected_metrics"] = affected_metrics
        if correlated_deployment_id and not existing.get("correlated_deployment_id"):
            update_payload["correlated_deployment_id"] = correlated_deployment_id

        supabase.table("incidents").update(update_payload).eq("id", existing_id).execute()

        # Add event to timeline
        _add_incident_event(
            incident_id=existing_id,
            event_type="signal_correlated",
            description=(
                f"Alert storm prevented: grouped new signals into ongoing incident. "
                f"Updated score: {updated_score} ({'; '.join(score_reasons)})"
            ),
        )

        _mark_anomalies_processed(anomalies)
        logger.info(f"Updated existing incident INC-{existing_id} for {service_id}")
        return {**existing, **update_payload}

    # ──────────────────────────────────────────────
    # Historical Precedent Matching
    # ──────────────────────────────────────────────
    similar_incidents = _find_similar_incidents(service_id, error_logs)

    # ──────────────────────────────────────────────
    # Create New Incident
    # ──────────────────────────────────────────────
    service_label = service_id.replace("-", " ").title()
    incident_tag = uuid.uuid4().hex[:4].upper()
    title = f"INC-{incident_tag} — {service_label} Degradation"

    incident_payload = {
        "title": title,
        "severity": severity,
        "status": "detected",
        "service_id": service_id,
        "start_time": now.isoformat(),
        "correlation_score": score,
        "affected_metrics": affected_metrics,
        "correlated_log_ids": correlated_log_ids,
        "correlated_deployment_id": correlated_deployment_id,
        "similar_incident_ids": similar_incidents,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    insert_res = supabase.table("incidents").insert(incident_payload).execute()
    if not insert_res.data:
        logger.error(f"Failed to insert incident for {service_id}")
        return None

    created_incident = insert_res.data[0]
    incident_id = created_incident["id"]

    # Record initial creation event
    _add_incident_event(
        incident_id=incident_id,
        event_type="detected",
        description=(
            f"Incident automatically created with score {score} ({severity}). "
            f"Correlated signals: {'; '.join(score_reasons)}"
        ),
    )

    # Push in-app notification
    try:
        supabase.table("notifications").insert({
            "message": f"🔴 {severity} Incident: {title}",
            "type": "incident",
            "incident_id": incident_id,
            "created_at": now.isoformat(),
        }).execute()
    except Exception as notify_err:
        logger.debug(f"Could not write notification: {notify_err}")

    # Mark processed anomalies
    _mark_anomalies_processed(anomalies)

    logger.info(
        f"CREATED INCIDENT #{incident_id} [{severity}] for {service_id}: {title} "
        f"(Score: {score})"
    )
    return created_incident


def _find_similar_incidents(service_id: str, current_error_logs: list[dict]) -> list[dict]:
    """
    Search historical resolved incidents for the same service and calculate keyword overlap.
    Stores lightweight incident metadata (IDs + summaries) to preserve column size.
    """
    if not supabase:
        return []

    try:
        # Extract keywords from current error logs
        current_tokens = set()
        for log in current_error_logs:
            words = re.findall(r"\b[a-zA-Z]{4,}\b", log.get("message", "").lower())
            current_tokens.update(words)

        if not current_tokens:
            return []

        # Query past resolved incidents
        past_res = (
            supabase.table("incidents")
            .select("id, title, severity, start_time, resolved_at, resolution_time_minutes, correlated_log_ids")
            .eq("service_id", service_id)
            .eq("status", "resolved")
            .order("start_time", desc=True)
            .limit(10)
            .execute()
        )
        past_incidents = past_res.data or []
        if not past_incidents:
            return []

        scored_matches = []
        for past in past_incidents:
            # Simple keyword match on title + past logs
            past_title_words = set(re.findall(r"\b[a-zA-Z]{4,}\b", past.get("title", "").lower()))
            overlap = current_tokens.intersection(past_title_words)
            match_score = len(overlap) / max(len(past_title_words), 1)

            # Boost if same severity
            score_val = min(round(match_score * 0.8 + 0.2, 2), 0.95)

            scored_matches.append({
                "id": past["id"],
                "title": past["title"],
                "similarity_score": score_val,
                "resolution_time_minutes": past.get("resolution_time_minutes"),
                "resolved_at": past.get("resolved_at"),
            })

        # Sort by similarity score descending and take top 3
        scored_matches.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_matches[:3]

    except Exception as e:
        logger.debug(f"Historical similarity matching failed: {e}")
        return []


def _add_incident_event(incident_id: int, event_type: str, description: str, created_by: Optional[str] = None):
    """Append a timeline audit event to the incident_events table."""
    if not supabase:
        return

    try:
        payload = {
            "incident_id": incident_id,
            "event_type": event_type,
            "description": description,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        if created_by:
            payload["created_by"] = created_by

        supabase.table("incident_events").insert(payload).execute()
    except Exception as e:
        logger.warning(f"Failed to record incident event for INC-{incident_id}: {e}")


def _mark_anomalies_processed(anomalies: list[dict]):
    """Mark correlated anomaly records as processed."""
    if not supabase or not anomalies:
        return

    try:
        unprocessed_ids = [a["id"] for a in anomalies if not a.get("processed")]
        if unprocessed_ids:
            supabase.table("anomalies").update({"processed": True}).in_("id", unprocessed_ids).execute()
    except Exception as e:
        logger.debug(f"Could not mark anomalies as processed: {e}")
