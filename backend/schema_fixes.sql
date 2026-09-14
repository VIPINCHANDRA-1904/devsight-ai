-- ══════════════════════════════════════════════════════════
-- DEVSIGHTAI — Supabase Linter Fixes
-- ══════════════════════════════════════════════════════════
-- Run this AFTER schema.sql to resolve all linter warnings.
-- ══════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────
-- FIX 1: Enable RLS on the 9 missing tables
-- ──────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE predicted_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_targets ENABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────
-- FIX 1b: Add read policies for the new RLS tables
-- ──────────────────────────────────────────────
-- Backend uses service_role key (bypasses RLS).
-- Frontend needs these policies to read via anon key.

CREATE POLICY "Allow read on users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow read on service_dependencies" ON service_dependencies
    FOR SELECT USING (true);

CREATE POLICY "Allow read on anomalies" ON anomalies
    FOR SELECT USING (true);

CREATE POLICY "Allow read on predicted_warnings" ON predicted_warnings
    FOR SELECT USING (true);

CREATE POLICY "Allow read on incident_events" ON incident_events
    FOR SELECT USING (true);

CREATE POLICY "Allow read on incident_analysis" ON incident_analysis
    FOR SELECT USING (true);

CREATE POLICY "Allow read on incident_chat" ON incident_chat
    FOR SELECT USING (true);

CREATE POLICY "Allow read on deployment_health" ON deployment_health
    FOR SELECT USING (true);

CREATE POLICY "Allow read on sla_targets" ON sla_targets
    FOR SELECT USING (true);


-- ──────────────────────────────────────────────
-- FIX 2: Add indexes on unindexed foreign keys
-- ──────────────────────────────────────────────

-- service_dependencies
CREATE INDEX IF NOT EXISTS idx_service_deps_source
    ON service_dependencies (source_service_id);

CREATE INDEX IF NOT EXISTS idx_service_deps_target
    ON service_dependencies (target_service_id);

-- incidents
CREATE INDEX IF NOT EXISTS idx_incidents_deployment
    ON incidents (correlated_deployment_id);

CREATE INDEX IF NOT EXISTS idx_incidents_assigned
    ON incidents (assigned_to);

-- incident_events
CREATE INDEX IF NOT EXISTS idx_incident_events_incident
    ON incident_events (incident_id);

CREATE INDEX IF NOT EXISTS idx_incident_events_user
    ON incident_events (created_by);

-- incident_chat
CREATE INDEX IF NOT EXISTS idx_incident_chat_incident
    ON incident_chat (incident_id);

-- deployment_health
CREATE INDEX IF NOT EXISTS idx_deployment_health_deployment
    ON deployment_health (deployment_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_incident
    ON notifications (incident_id);
