"""
DEVSIGHTAI — Trend Analysis Service (Pandas)

Rolling-window trend analysis for predictive warnings.
Detects monotonically increasing resource usage and predicts
when critical thresholds will be reached.

Runs as a FastAPI BackgroundTask alongside anomaly detection.

Pipeline:
  1. Pull last 100 metric rows for the service
  2. Compute rolling mean over window of 8 data points (~80s at 10s intervals)
  3. Fit linear regression (numpy.polyfit) to detect slope
  4. If slope > threshold AND current value > 70%: generate predictive warning
  5. Insert into predicted_warnings table
"""

import logging
from datetime import datetime, timezone, timedelta

import numpy as np
import pandas as pd

from app.core.supabase_client import supabase

logger = logging.getLogger("devsightai.trend_analyzer")

# Rolling window size (8 data points at 10s intervals = ~80 seconds)
ROLLING_WINDOW = 8

# Minimum data points required for trend analysis
MIN_DATA_POINTS = 20

# Metrics to analyze for trends
TREND_METRICS = [
    {"column": "cpu", "label": "CPU", "threshold_pct": 70, "slope_threshold": 0.3},
    {"column": "memory", "label": "Memory", "threshold_pct": 70, "slope_threshold": 0.2},
    {"column": "disk", "label": "Disk", "threshold_pct": 80, "slope_threshold": 0.1},
]

# Don't re-warn within this cooldown period (minutes)
WARNING_COOLDOWN_MINUTES = 15


def run_trend_analysis(service_id: str) -> None:
    """
    Pandas-based rolling window trend analysis.

    Called as a FastAPI BackgroundTask after every /api/metrics insert.
    Writes to the 'predicted_warnings' table if a concerning trend is detected.
    """
    if not supabase:
        logger.warning("Supabase not configured - skipping trend analysis")
        return

    try:
        _run_analysis(service_id)
    except Exception as e:
        # BackgroundTask must never crash the server
        logger.error(f"Trend analysis failed for {service_id}: {e}")


def _run_analysis(service_id: str) -> None:
    """Internal analysis logic."""

    # 1. Pull recent metrics
    result = (
        supabase.table("metrics")
        .select("timestamp,cpu,memory,disk")
        .eq("service_id", service_id)
        .order("timestamp", desc=True)
        .limit(100)
        .execute()
    )

    if not result.data or len(result.data) < MIN_DATA_POINTS:
        logger.debug(f"Not enough data for trend analysis on {service_id}")
        return

    # 2. Load into DataFrame and sort chronologically (oldest first)
    df = pd.DataFrame(result.data)
    df = df.sort_values("timestamp").reset_index(drop=True)

    # 3. Analyze each metric independently
    for metric_config in TREND_METRICS:
        col = metric_config["column"]
        if col not in df.columns:
            continue

        _analyze_metric(service_id, df, metric_config)


def _analyze_metric(service_id: str, df: pd.DataFrame, metric_config: dict) -> None:
    """Analyze a single metric column for concerning trends."""
    col = metric_config["column"]
    label = metric_config["label"]
    threshold_pct = metric_config["threshold_pct"]
    slope_threshold = metric_config["slope_threshold"]

    series = df[col].fillna(0).astype(float)
    current_value = float(series.iloc[-1])

    # Skip if current value is below threshold — no concern
    if current_value < threshold_pct:
        return

    # Compute rolling mean
    rolling_mean = series.rolling(window=ROLLING_WINDOW, min_periods=4).mean()
    valid_means = rolling_mean.dropna()

    if len(valid_means) < 4:
        return

    # Fit linear regression to the rolling means
    x = np.arange(len(valid_means))
    y = valid_means.values
    slope, intercept = np.polyfit(x, y, 1)

    # Check if slope exceeds threshold (increasing trend)
    if slope < slope_threshold:
        return

    # Estimate time to critical (100%)
    if slope > 0:
        remaining_pct = 100.0 - current_value
        steps_to_critical = remaining_pct / slope
        # Each step is ~10 seconds
        minutes_to_critical = (steps_to_critical * 10) / 60
        predicted_critical_at = datetime.now(timezone.utc) + timedelta(
            minutes=minutes_to_critical
        )
    else:
        predicted_critical_at = None
        minutes_to_critical = 0

    # Check cooldown — don't re-warn too frequently
    if _is_in_cooldown(service_id, col):
        logger.debug(
            f"Skipping {label} warning for {service_id} - in cooldown period"
        )
        return

    # Determine severity based on current value and trend speed
    if current_value >= 90 or minutes_to_critical < 5:
        severity = "CRITICAL"
    elif current_value >= 80 or minutes_to_critical < 15:
        severity = "HIGH"
    elif current_value >= 70:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    # Build human-readable warning message
    if minutes_to_critical > 0 and minutes_to_critical < 120:
        message = (
            f"{label} usage has been increasing steadily - "
            f"currently at {current_value:.1f}%, "
            f"may reach critical in ~{int(minutes_to_critical)} min"
        )
    else:
        message = (
            f"{label} usage is elevated and trending upward - "
            f"currently at {current_value:.1f}% "
            f"(slope: {slope:.2f}%/sample)"
        )

    # Insert warning
    warning_data = {
        "service_id": service_id,
        "metric": col,
        "current_value": round(current_value, 2),
        "predicted_critical_at": (
            predicted_critical_at.isoformat() if predicted_critical_at else None
        ),
        "severity": severity,
        "message": message,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "acknowledged": False,
    }

    supabase.table("predicted_warnings").insert(warning_data).execute()

    logger.info(
        f"TREND WARNING for {service_id}: {label} at {current_value:.1f}% "
        f"(slope={slope:.3f}, severity={severity})"
    )


def _is_in_cooldown(service_id: str, metric: str) -> bool:
    """Check if a warning was recently issued for this service+metric."""
    try:
        cooldown_since = (
            datetime.now(timezone.utc) - timedelta(minutes=WARNING_COOLDOWN_MINUTES)
        ).isoformat()

        result = (
            supabase.table("predicted_warnings")
            .select("id")
            .eq("service_id", service_id)
            .eq("metric", metric)
            .gte("created_at", cooldown_since)
            .limit(1)
            .execute()
        )

        return len(result.data) > 0
    except Exception:
        # If cooldown check fails, allow the warning
        return False
