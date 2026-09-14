"""
DEVSIGHTAI — IsolationForest Anomaly Detection Service

Runs as a FastAPI BackgroundTask after every metric ingestion.
Never blocks the ingestion endpoint — fire-and-forget.

Pipeline:
  1. Pull last 100 metric rows for the service from Supabase
  2. Guard: skip if < 20 rows (not enough data for IsolationForest)
  3. Load into Pandas DataFrame
  4. Fit IsolationForest(contamination=0.05, random_state=42)
  5. If latest row is anomalous (score == -1): write to anomalies table
"""

import logging
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from app.core.supabase_client import supabase

logger = logging.getLogger("devsightai.anomaly_detector")

# Minimum rows before IsolationForest can produce meaningful results
MIN_DATA_POINTS = 20

# IsolationForest hyperparameters (per implementation plan)
CONTAMINATION = 0.05
RANDOM_STATE = 42

# Feature columns used for anomaly detection
FEATURE_COLS = ["cpu", "memory", "disk", "network_sent_mb", "network_recv_mb"]


def run_anomaly_detection(service_id: str, server_id: str | None = None) -> None:
    """
    IsolationForest anomaly detection pipeline.

    Called as a FastAPI BackgroundTask after every /api/metrics insert.
    Writes to the 'anomalies' table if the latest data point is anomalous.
    """
    if not supabase:
        logger.warning("Supabase not configured - skipping anomaly detection")
        return

    try:
        _run_detection(service_id, server_id)
    except Exception as e:
        # BackgroundTask must never crash the server
        logger.error(f"Anomaly detection failed for {service_id}: {e}")


def _run_detection(service_id: str, server_id: str | None) -> None:
    """Internal detection logic — separated for cleaner error handling."""

    # 1. Pull recent metrics from Supabase
    query = (
        supabase.table("metrics")
        .select("timestamp,cpu,memory,disk,network_sent_mb,network_recv_mb,server_id")
        .order("timestamp", desc=True)
        .limit(100)
    )

    # Filter by service_id if available, otherwise by server_id
    if service_id:
        query = query.eq("service_id", service_id)
    elif server_id:
        query = query.eq("server_id", server_id)
    else:
        return

    result = query.execute()

    if not result.data:
        logger.debug(f"No metrics found for service {service_id}")
        return

    # 2. Load into DataFrame
    df = pd.DataFrame(result.data)

    # 3. Guard: not enough data for IsolationForest
    if len(df) < MIN_DATA_POINTS:
        logger.debug(
            f"Only {len(df)} rows for {service_id} - need {MIN_DATA_POINTS} minimum"
        )
        return

    # 4. Extract feature matrix (only numeric columns the model uses)
    available_features = [col for col in FEATURE_COLS if col in df.columns]
    if not available_features:
        logger.warning(f"No feature columns found for {service_id}")
        return

    X = df[available_features].fillna(0).values

    # 5. Fit IsolationForest and predict
    model = IsolationForest(
        contamination=CONTAMINATION,
        random_state=RANDOM_STATE,
        n_estimators=100,
    )
    predictions = model.fit_predict(X)
    scores = model.decision_function(X)

    # 6. Check if the LATEST row (index 0, since ordered desc) is anomalous
    latest_prediction = predictions[0]
    latest_score = float(scores[0])

    if latest_prediction == -1:
        # Latest data point is anomalous — write to anomalies table
        latest_row = df.iloc[0]

        metric_snapshot = {
            col: float(latest_row[col])
            for col in available_features
            if col in latest_row
        }
        metric_snapshot["timestamp"] = latest_row.get("timestamp", "")

        anomaly_data = {
            "service_id": service_id,
            "server_id": server_id or latest_row.get("server_id", ""),
            "anomaly_score": round(latest_score, 4),
            "metric_snapshot": metric_snapshot,
            "detected_at": datetime.now(timezone.utc).isoformat(),
            "processed": False,
        }

        supabase.table("anomalies").insert(anomaly_data).execute()

        logger.info(
            f"ANOMALY DETECTED for {service_id}: "
            f"score={latest_score:.4f}, "
            f"cpu={metric_snapshot.get('cpu', 0):.1f}%, "
            f"memory={metric_snapshot.get('memory', 0):.1f}%"
        )

        # Trigger Phase 3 Incident Correlation
        try:
            from app.services.correlator import correlate_incident
            correlate_incident(service_id)
        except Exception as corr_err:
            logger.error(f"Correlation trigger failed for {service_id}: {corr_err}")
    else:
        logger.debug(
            f"No anomaly for {service_id} (score={latest_score:.4f})"
        )
