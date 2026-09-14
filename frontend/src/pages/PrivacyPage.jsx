/**
 * DEVSIGHTAI — Privacy Policy
 *
 * Outlines telemetry data handling, collection boundaries, retention schedules,
 * and data protection practices for the DEVSIGHTAI reliability platform.
 */

import { Link } from 'react-router-dom'
import { IconShield, IconLock, IconDatabase, IconServer } from '../components/icons'

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="border-b border-border-default pb-5">
        <div className="flex items-center gap-2 text-accent-green mb-2 text-xs font-mono font-semibold uppercase tracking-wider">
          <IconShield className="w-4 h-4" />
          <span>Data Governance & Privacy</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">
          Privacy Policy
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Effective Date: September 2026 • Platform Version 1.0
        </p>
      </div>

      {/* Overview Card */}
      <div className="p-5 rounded-xl border border-border-default bg-bg-card space-y-3">
        <h2 className="text-base font-bold text-text-primary">
          1. Platform Scope & Purpose
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          DEVSIGHTAI is an engineering reliability and incident intelligence platform designed to monitor microservice health, detect performance anomalies, and provide automated root-cause diagnostics. This policy explains how telemetry, performance metrics, and operational logs collected by DEVSIGHTAI agents and APIs are processed and protected.
        </p>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-border-default bg-bg-card space-y-3">
          <div className="flex items-center gap-2 text-accent-blue font-bold text-sm">
            <IconServer className="w-4 h-4" />
            <h3>2. Information We Collect</h3>
          </div>
          <ul className="text-xs text-text-secondary space-y-2 leading-relaxed list-disc list-inside">
            <li><strong className="text-text-primary">System Telemetry:</strong> CPU utilization, memory allocation, disk I/O, and network packet throughput via psutil agent.</li>
            <li><strong className="text-text-primary">Application Logs:</strong> Timestamped service error logs, HTTP response codes, latency distributions, and exception stack traces.</li>
            <li><strong className="text-text-primary">Release Metadata:</strong> Commit hashes, version tags, environment markers, and deployment timestamps.</li>
            <li><strong className="text-text-primary">Account Identifiers:</strong> Work email and role assignments (Developer, DevOps, QA, Manager).</li>
          </ul>
        </div>

        <div className="p-5 rounded-xl border border-border-default bg-bg-card space-y-3">
          <div className="flex items-center gap-2 text-accent-green font-bold text-sm">
            <IconDatabase className="w-4 h-4" />
            <h3>3. Data Usage & Processing</h3>
          </div>
          <ul className="text-xs text-text-secondary space-y-2 leading-relaxed list-disc list-inside">
            <li><strong className="text-text-primary">Anomaly Detection:</strong> Telemetry vectors are scored locally by Scikit-learn IsolationForest models.</li>
            <li><strong className="text-text-primary">Incident Correlation:</strong> Multi-signal temporal clustering connects metrics with log bursts.</li>
            <li><strong className="text-text-primary">RCA Diagnostics:</strong> Sanitized telemetry summaries are processed via token-capped Groq LPU inference solely for root-cause synthesis.</li>
            <li><strong className="text-text-primary">No External Selling:</strong> Telemetry data is never sold, licensed, or repurposed for marketing.</li>
          </ul>
        </div>
      </div>

      {/* Retention & Security */}
      <div className="p-5 rounded-xl border border-border-default bg-bg-card space-y-4">
        <h2 className="text-base font-bold text-text-primary">
          4. Retention & Data Security
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle space-y-1">
            <span className="font-mono font-bold text-text-primary">Raw Metrics (10s):</span>
            <p className="text-text-muted">Retained for 14 days in hot storage, aggregated hourly thereafter.</p>
          </div>
          <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle space-y-1">
            <span className="font-mono font-bold text-text-primary">Error Logs & Traces:</span>
            <p className="text-text-muted">Retained for 30 days. PII scrubbing is applied at ingestion.</p>
          </div>
          <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle space-y-1">
            <span className="font-mono font-bold text-text-primary">Incident Post-Mortems:</span>
            <p className="text-text-muted">Preserved for audit compliance until explicitly deleted by team administrators.</p>
          </div>
        </div>
      </div>

      {/* Local Storage & Preferences */}
      <div className="p-5 rounded-xl border border-border-default bg-bg-card space-y-3">
        <h2 className="text-base font-bold text-text-primary">
          5. Local Storage & Client Cookies
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          The client web application uses browser LocalStorage strictly for functional session preferences, including active role selection (<code className="font-mono text-xs text-accent-blue">devsight_role</code>) and visual theme mode (<code className="font-mono text-xs text-accent-blue">devsight_theme</code>). No third-party advertising cookies or cross-site tracking beacons are embedded.
        </p>
      </div>

      {/* Contact Footer */}
      <div className="pt-4 border-t border-border-default flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-2">
        <p>Questions regarding telemetry privacy? Contact <span className="font-mono text-text-secondary">security@devsight.ai</span></p>
        <Link to="/" className="text-accent-blue hover:underline font-medium">
          ← Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
