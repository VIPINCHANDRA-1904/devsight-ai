"""
DEVSIGHTAI — Realtime Notifications & In-App Alerts Router (Phase 6)

Implements:
  - GET   /api/notifications/               → List recent notifications + unread count
  - PATCH /api/notifications/{id}/read      → Mark notification as read
  - POST  /api/notifications/mark-all-read  → Mark all as read
  - POST  /api/notifications/               → Create in-app alert
  - POST  /api/notifications/test           → Seed test notification with email alert simulation
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.supabase_client import supabase
from app.models.schemas import NotificationCreateRequest, NotificationResponse

logger = logging.getLogger("devsightai.notifications")

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# In-memory notifications fallback for demo/offline presentation
DEMO_NOTIFICATIONS = [
    {
        "id": 1,
        "user_id": None,
        "message": "🔴 Critical Incident Created: Payment Service Degradation (Error rate +1675%)",
        "type": "incident",
        "read": False,
        "incident_id": 1024,
        "created_at": "2026-09-14T10:24:00Z",
    },
    {
        "id": 2,
        "user_id": None,
        "message": "⚠️ Regression Detected: Potential regression after payment-service v2.4.0 deployment",
        "type": "deployment",
        "read": False,
        "incident_id": 1024,
        "created_at": "2026-09-14T10:22:30Z",
    },
    {
        "id": 3,
        "user_id": None,
        "message": "⚠ Predictive Warning: Memory usage increasing on server-01 for 40 min",
        "type": "prediction",
        "read": True,
        "incident_id": None,
        "created_at": "2026-09-14T09:45:00Z",
    },
    {
        "id": 4,
        "user_id": None,
        "message": "🔴 SLA Risk: payment-service availability dropped to 98.4% (below 99.9% target)",
        "type": "sla",
        "read": False,
        "incident_id": None,
        "created_at": "2026-09-14T08:15:00Z",
    },
]


@router.get("/")
async def get_notifications(
    unread_only: bool = Query(False, description="Filter only unread notifications"),
    limit: int = Query(30, ge=1, le=100),
):
    """
    Query notifications list and calculate total unread badge count.
    """
    items = list(DEMO_NOTIFICATIONS)

    if supabase:
        try:
            query = supabase.table("notifications").select("*")
            if unread_only:
                query = query.eq("read", False)
            res = query.order("created_at", desc=True).limit(limit).execute()
            if res.data and len(res.data) > 0:
                items = res.data
        except Exception as e:
            logger.debug(f"Could not load notifications from DB: {e}")

    if unread_only:
        items = [n for n in items if not n.get("read")]

    unread_count = sum(1 for n in items if not n.get("read"))

    return {
        "data": items[:limit],
        "unread_count": unread_count,
        "total_count": len(items),
    }


@router.patch("/{notification_id}/read")
async def mark_notification_read(notification_id: int):
    """
    Mark a single notification as read.
    """
    found = False
    for n in DEMO_NOTIFICATIONS:
        if n["id"] == notification_id:
            n["read"] = True
            found = True
            break

    if supabase:
        try:
            supabase.table("notifications").update({"read": True}).eq("id", notification_id).execute()
        except Exception as e:
            logger.debug(f"Notification update DB error: {e}")

    return {"status": "ok", "id": notification_id, "read": True}


@router.post("/mark-all-read")
async def mark_all_notifications_read():
    """
    Mark all active notifications as read.
    """
    for n in DEMO_NOTIFICATIONS:
        n["read"] = True

    if supabase:
        try:
            supabase.table("notifications").update({"read": True}).eq("read", False).execute()
        except Exception as e:
            logger.debug(f"Mark all read DB error: {e}")

    return {"status": "ok", "marked_all_read": True}


@router.post("/", status_code=201)
async def create_notification(payload: NotificationCreateRequest):
    """
    Create a new in-app alert notification and simulate email dispatch for critical alerts.
    """
    now = datetime.now(timezone.utc).isoformat()
    new_id = len(DEMO_NOTIFICATIONS) + 100

    notif_data = {
        "id": new_id,
        "user_id": payload.user_id,
        "message": payload.message,
        "type": payload.type,
        "read": False,
        "incident_id": payload.incident_id,
        "created_at": now,
    }

    DEMO_NOTIFICATIONS.insert(0, notif_data)

    if supabase:
        try:
            res = supabase.table("notifications").insert({
                "message": payload.message,
                "type": payload.type,
                "read": False,
                "incident_id": payload.incident_id,
                "user_id": payload.user_id,
            }).execute()
            if res.data:
                notif_data = res.data[0]
        except Exception as e:
            logger.error(f"Failed to persist notification in DB: {e}")

    # Email simulation logging for critical incidents (Implementation plan watchpoint)
    if payload.type in ("incident", "sla") and "critical" in payload.message.lower():
        logger.info(f"📧 [Email Alert Dispatched] To: sre-oncall@devsight.ai | Subject: ALERT: {payload.message}")

    return {"status": "ok", "notification": notif_data}


@router.post("/test")
async def trigger_test_alert():
    """
    Trigger a test alert notification for UI demonstration.
    """
    return await create_notification(
        NotificationCreateRequest(
            message="🔔 Test Alert: System telemetry and notification stream operating normally",
            type="system",
        )
    )
