-- ══════════════════════════════════════════════════════════
-- DEVSIGHTAI — Supabase Database Schema
-- ══════════════════════════════════════════════════════════
-- Run this SQL in the Supabase SQL Editor to create all tables.
-- The backend uses SUPABASE_SERVICE_KEY (bypasses RLS for writes).
-- The frontend uses SUPABASE_ANON_KEY (RLS-protected reads).
-- ══════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────
-- 1. USERS — Authentication & role-based access
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'developer'
        CHECK (role IN ('developer', 'devops', 'qa', 'manager', 'admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ──────────────────────────────────────────────
-- 2. SERVICES — Monitored applications/services
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    service_type TEXT DEFAULT 'application'
        CHECK (service_type IN ('application', 'database', 'gateway', 'infrastructure')),
    status TEXT DEFAULT 'healthy'
        CHECK (status IN ('healthy', 'degraded', 'critical', 'unknown')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ──────────────────────────────────────────────
-- 3. SERVICE_DEPENDENCIES — For the D3 dependency map
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service_dependencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    target_service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'calls'
        CHECK (dependency_type IN ('calls', 'reads', 'writes', 'depends_on')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source_service_id, target_service_id)
);


-- ──────────────────────────────────────────────
-- 4. METRICS — Server-level metrics from psutil agent
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS metrics (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    server_id TEXT NOT NULL,
    service_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cpu REAL NOT NULL,
    memory REAL NOT NULL,
    disk REAL DEFAULT 0,
    network_sent_mb REAL DEFAULT 0,
    network_recv_mb REAL DEFAULT 0
);

-- Index for time-series queries (GET /api/metrics/{service_id})
CREATE INDEX IF NOT EXISTS idx_metrics_service_time
    ON metrics (service_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_server_time
    ON metrics (server_id, timestamp DESC);


-- ──────────────────────────────────────────────
-- 5. EVENTS — HTTP request events from instrumented apps
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT DEFAULT 'GET',
    status_code INTEGER NOT NULL,
    response_time REAL NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_service_time
    ON events (service_id, timestamp DESC);


-- ──────────────────────────────────────────────
-- 6. LOGS — Application log entries
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_id TEXT NOT NULL,
    message TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'INFO'
        CHECK (level IN ('INFO', 'WARN', 'ERROR', 'CRITICAL')),
    source TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_service_level_time
    ON logs (service_id, level, timestamp DESC);


-- ──────────────────────────────────────────────
-- 7. DEPLOYMENTS — CI/CD deployment events
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deployments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id TEXT NOT NULL,
    version TEXT NOT NULL,
    environment TEXT DEFAULT 'production',
    deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deployed_by TEXT,
    commit_hash TEXT,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_deployments_service_time
    ON deployments (service_id, deployed_at DESC);


-- ──────────────────────────────────────────────
-- 8. ANOMALIES — Detected by IsolationForest (Phase 2)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS anomalies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_id TEXT NOT NULL,
    server_id TEXT,
    anomaly_score REAL NOT NULL,
    metric_snapshot JSONB NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_anomalies_service_time
    ON anomalies (service_id, detected_at DESC);


-- ──────────────────────────────────────────────
-- 9. PREDICTED_WARNINGS — Trend-based predictions (Phase 2)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS predicted_warnings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    current_value REAL NOT NULL,
    predicted_critical_at TIMESTAMPTZ,
    severity TEXT DEFAULT 'MEDIUM'
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT FALSE
);


-- ──────────────────────────────────────────────
-- 10. INCIDENTS — Correlated incidents (Phase 3)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incidents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'MEDIUM'
        CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status TEXT NOT NULL DEFAULT 'detected'
        CHECK (status IN ('detected', 'assigned', 'investigating',
                          'root_cause_identified', 'fix_applied', 'resolved')),
    service_id TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolution_time_minutes REAL,
    correlation_score INTEGER DEFAULT 0,
    affected_metrics JSONB DEFAULT '{}',
    correlated_log_ids JSONB DEFAULT '[]',
    correlated_deployment_id UUID REFERENCES deployments(id),
    similar_incident_ids JSONB DEFAULT '[]',
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_service_status
    ON incidents (service_id, status);

CREATE INDEX IF NOT EXISTS idx_incidents_severity
    ON incidents (severity, created_at DESC);


-- ──────────────────────────────────────────────
-- 11. INCIDENT_EVENTS — Timeline of incident activity
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    incident_id BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ──────────────────────────────────────────────
-- 12. INCIDENT_ANALYSIS — AI-generated RCA (Phase 4)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_analysis (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    incident_id BIGINT UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
    root_cause TEXT,
    evidence JSONB DEFAULT '[]',
    recommended_actions JSONB DEFAULT '[]',
    business_impact TEXT,
    confidence TEXT DEFAULT 'MEDIUM'
        CHECK (confidence IN ('LOW', 'MEDIUM', 'HIGH')),
    model_used TEXT DEFAULT 'llama-3.3-70b-versatile',
    context_tokens INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ──────────────────────────────────────────────
-- 13. INCIDENT_CHAT — AI Assistant conversation (Phase 4)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incident_chat (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    incident_id BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ──────────────────────────────────────────────
-- 14. DEPLOYMENT_HEALTH — Before/After comparison (Phase 5)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS deployment_health (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
    service_id TEXT NOT NULL,
    metric TEXT NOT NULL,
    before_value REAL,
    after_value REAL,
    delta_pct REAL,
    status TEXT DEFAULT 'healthy'
        CHECK (status IN ('healthy', 'warning', 'critical')),
    evaluated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ──────────────────────────────────────────────
-- 15. SLA_TARGETS — SLA/SLO configuration (Phase 6)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sla_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id TEXT NOT NULL,
    availability_target REAL DEFAULT 99.9,
    max_latency_ms REAL DEFAULT 1000,
    max_error_rate_pct REAL DEFAULT 5.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ──────────────────────────────────────────────
-- 16. NOTIFICATIONS — In-app + email alerts (Phase 6)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'incident'
        CHECK (type IN ('incident', 'sla', 'prediction', 'deployment', 'system')),
    read BOOLEAN DEFAULT FALSE,
    incident_id BIGINT REFERENCES incidents(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, read, created_at DESC);


-- ══════════════════════════════════════════════════════════
-- ENABLE REALTIME — Required for live dashboard updates
-- ══════════════════════════════════════════════════════════
-- Enable Realtime on key tables (must also be enabled in
-- the Supabase Dashboard under Database → Replication).

ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE metrics;


-- ══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — Policies for frontend ANON_KEY reads
-- ══════════════════════════════════════════════════════════
-- Note: The backend uses SERVICE_KEY which bypasses RLS entirely.
-- These policies only apply to frontend direct reads via ANON_KEY.

ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated reads on all monitoring tables
CREATE POLICY "Allow authenticated read on metrics" ON metrics
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read on logs" ON logs
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read on events" ON events
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read on incidents" ON incidents
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read on notifications" ON notifications
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read on services" ON services
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated read on deployments" ON deployments
    FOR SELECT USING (true);
