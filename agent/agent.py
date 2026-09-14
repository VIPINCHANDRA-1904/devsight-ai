"""
DEVSIGHTAI — psutil Monitoring Agent

Lightweight single-file agent that collects server-level metrics
(CPU, RAM, Disk, Network) via psutil and POSTs them to the
DEVSIGHTAI FastAPI backend every N seconds.

Configuration via environment variables:
  DEVSIGHTAI_URL      — Backend API URL (default: http://localhost:8000)
  SERVER_ID           — Unique identifier for this server (default: server-01)
  SERVICE_ID          — Associated service ID (default: server-01)
  COLLECTION_INTERVAL — Seconds between collections (default: 10)
  DISK_PATH           — Disk path or mount point to monitor (default: current root drive)

Usage:
  python agent.py
"""

import os
import sys
import time
from datetime import datetime, timezone

import psutil
import requests
from dotenv import load_dotenv

load_dotenv()

# ──────────────────────────────────────────────
# Configuration — no hardcoded values
# ──────────────────────────────────────────────

DEVSIGHTAI_URL = os.getenv("DEVSIGHTAI_URL", "http://localhost:8000").rstrip("/")
SERVER_ID = os.getenv("SERVER_ID", "server-01")
SERVICE_ID = os.getenv("SERVICE_ID", "server-01")
COLLECTION_INTERVAL = int(os.getenv("COLLECTION_INTERVAL", "10"))
DISK_PATH = os.getenv("DISK_PATH", os.path.abspath(os.sep))
METRICS_ENDPOINT = f"{DEVSIGHTAI_URL}/api/metrics/"


def collect_metrics() -> dict:
    """Collect current system metrics safely using psutil."""
    # Network I/O (can be None on certain virtual/container environments)
    try:
        net_io = psutil.net_io_counters()
        sent_mb = round(net_io.bytes_sent / (1024 * 1024), 2) if net_io else 0.0
        recv_mb = round(net_io.bytes_recv / (1024 * 1024), 2) if net_io else 0.0
    except Exception:
        sent_mb = 0.0
        recv_mb = 0.0

    # Disk usage (safe across Windows drive letters and POSIX roots)
    try:
        disk_pct = psutil.disk_usage(DISK_PATH).percent
    except Exception:
        try:
            disk_pct = psutil.disk_usage("/").percent
        except Exception:
            disk_pct = 0.0

    return {
        "server_id": SERVER_ID,
        "service_id": SERVICE_ID,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cpu": psutil.cpu_percent(interval=1),
        "memory": psutil.virtual_memory().percent,
        "disk": disk_pct,
        "network_sent_mb": sent_mb,
        "network_recv_mb": recv_mb,
    }


def send_metrics(metrics: dict) -> bool:
    """
    POST metrics to the DEVSIGHTAI backend.

    Wrapped in try/except — agent must never crash if backend
    is temporarily down (implementation plan requirement).
    """
    try:
        response = requests.post(METRICS_ENDPOINT, json=metrics, timeout=10)
        if response.status_code in (200, 201):
            return True
        else:
            print(
                f"\n[WARN] Backend returned status {response.status_code}: "
                f"{response.text[:200]}",
                flush=True,
            )
            return False
    except requests.ConnectionError:
        print(f"\n[WARN] Cannot connect to backend at {DEVSIGHTAI_URL} - retrying next cycle", flush=True)
        return False
    except requests.Timeout:
        print("\n[WARN] Request to backend timed out - retrying next cycle", flush=True)
        return False
    except Exception as e:
        print(f"\n[ERROR] Unexpected error sending metrics: {e}", flush=True)
        return False


def main():
    """Main collection loop."""
    print("=" * 55, flush=True)
    print("  DEVSIGHTAI Monitoring Agent", flush=True)
    print("=" * 55, flush=True)
    print(f"  Server ID  : {SERVER_ID}", flush=True)
    print(f"  Service ID : {SERVICE_ID}", flush=True)
    print(f"  Backend URL: {DEVSIGHTAI_URL}", flush=True)
    print(f"  Interval   : {COLLECTION_INTERVAL}s", flush=True)
    print(f"  Disk Path  : {DISK_PATH}", flush=True)
    print("=" * 55, flush=True)
    print()

    while True:
        metrics = collect_metrics()

        # Print to console for visibility
        print(
            f"[{metrics['timestamp'][:19]}] "
            f"CPU: {metrics['cpu']:5.1f}% | "
            f"RAM: {metrics['memory']:5.1f}% | "
            f"Disk: {metrics['disk']:5.1f}%",
            end=" | ",
            flush=True,
        )

        success = send_metrics(metrics)
        status = "[OK] sent" if success else "[FAIL] (will retry)"
        print(status, flush=True)

        time.sleep(COLLECTION_INTERVAL)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nAgent stopped.", flush=True)
        sys.exit(0)
