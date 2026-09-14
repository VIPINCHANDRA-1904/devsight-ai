/**
 * DEVSIGHTAI — Demo Scenarios & Offline Telemetry Hub (Phase 7)
 *
 * Implements:
 * - 5 Live Failure Scenarios with 1-click execution and pipeline visualization:
 *   1. E-commerce: Checkout failure burst → Anomaly → Correlated Incident → Groq RCA
 *   2. College ERP: Traffic surge → Rolling window slope → Predictive SLA warning
 *   3. SaaS Bad Release: Deployment v2.4.0 → 30m delta comparison → Red Release Health card
 *   4. Memory Leak: Monotonic RAM growth → Projected OOM kill alert
 *   5. Service Cascade: DB lock contention → D3 dependency graph multi-service cascade
 * - Multi-Format Offline File Uploader (.log, .csv, .json) with IsolationForest scoring
 * - Instant Demo Environment Reset
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import ProfessorQAModal from '../components/ProfessorQAModal'
import {
  IconActivity,
  IconDefense,
  IconDeployments,
  IconCpu,
  IconDatabase,
  IconRefresh,
  IconPlay,
  IconCheck,
  IconDownload,
  IconAlertOctagon,
  IconArrowUpRight,
  IconFileText,
} from '../components/icons'

const SCENARIOS = [
  {
    key: 'ecommerce',
    title: 'Scenario 1: E-commerce Checkout Failure',
    subtitle: 'High Response Time + HTTP 500 Bursts → Groq RCA',
    service: 'payment-service',
    severity: 'CRITICAL',
    badge: 'bg-accent-red/20 text-accent-red border-accent-red/40',
    description: 'Simulates connection pool saturation on the payment service. Triggers IsolationForest anomaly scoring, auto-creates INC-1024, and calls Groq Llama-3.3-70B for instant RCA.',
    targetLink: '/incidents',
    targetLabel: 'View in Incident Intelligence →',
    icon: IconActivity,
  },
  {
    key: 'erp-spike',
    title: 'Scenario 2: College ERP Traffic Spike',
    subtitle: 'Traffic Surge (8,500 rpm) → Predictive Failure Warning',
    service: 'api-gateway',
    severity: 'WARNING',
    badge: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40',
    description: 'Simulates an 8,500 rpm surge during college exam results publication. Pandas rolling 40-minute window detects positive slope and fires predictive warning before system crash.',
    targetLink: '/metrics',
    targetLabel: 'View in Metrics Dashboard →',
    icon: IconDefense,
  },
  {
    key: 'bad-release',
    title: 'Scenario 3: SaaS Release Performance Regression',
    subtitle: 'Release v2.4.0 → +1675% Error Rate Drift → Release Health Card',
    service: 'payment-service',
    severity: 'CRITICAL',
    badge: 'bg-accent-red/20 text-accent-red border-accent-red/40',
    description: 'POSTs deployment v2.4.0 (commit #a4f891b). Evaluates 30-minute pre- vs post-deployment Pandas baseline metrics, turning Release Health card red and advising rollback.',
    targetLink: '/deployments',
    targetLabel: 'View in Release Intelligence →',
    icon: IconDeployments,
  },
  {
    key: 'memory-leak',
    title: 'Scenario 4: Gradual Memory Leak Exhaustion',
    subtitle: 'Uncollected Heap Allocations → Predicted OOM Alert',
    service: 'auth-service',
    severity: 'WARNING',
    badge: 'bg-accent-blue/20 text-accent-blue border-accent-blue/40',
    description: 'Generates monotonic heap allocation growth (58% → 91.2%). Regression slope predicts Out-Of-Memory termination ~15 minutes in advance.',
    targetLink: '/metrics',
    targetLabel: 'View in Metrics Dashboard →',
    icon: IconCpu,
  },
  {
    key: 'db-cascade',
    title: 'Scenario 5: Database Timeout Cascade in Topology',
    subtitle: 'PostgreSQL Contention → D3 Multi-Service Propagation',
    service: 'inventory-service',
    severity: 'CRITICAL',
    badge: 'bg-accent-red/20 text-accent-red border-accent-red/40',
    description: 'Injects database table locks and 30-second query timeouts, propagating red cascade failure through the D3 force-directed dependency graph to dependent services.',
    targetLink: '/services',
    targetLabel: 'View in Dependency Topology →',
    icon: IconDatabase,
  },
]

const SAMPLE_FILES = {
  log: `2026-09-14 10:24:01 payment-service INFO Received POST /api/v1/checkout user_id=4821
2026-09-14 10:24:03 payment-service WARN Database connection latency high (820ms)
2026-09-14 10:24:05 payment-service ERROR HikariCP pool exhausted (max 50 active connections reached)
2026-09-14 10:24:07 payment-service CRITICAL HTTP 504 Gateway Timeout during transaction token exchange
2026-09-14 10:24:09 order-service ERROR Failed to verify payment confirmation from payment-service
2026-09-14 10:24:12 payment-service CRITICAL Cascading thread starvation: 14 pending checkout requests dropped`,
  csv: `timestamp,service,cpu,memory,status_code,response_time,message
2026-09-14T10:20:00Z,payment-service,44.2,60.1,200,0.32,Normal checkout processing
2026-09-14T10:21:00Z,payment-service,48.0,62.0,200,0.34,Normal checkout processing
2026-09-14T10:22:00Z,payment-service,88.4,89.5,500,2.85,Database query timeout spike
2026-09-14T10:23:00Z,payment-service,94.2,91.2,504,3.10,Gateway timeout on upstream DB
2026-09-14T10:24:00Z,payment-service,96.0,92.4,500,2.95,Connection pool maximum limit exceeded`,
  json: JSON.stringify([
    { service_id: "payment-service", cpu: 46.0, memory: 61.0, level: "INFO", message: "API Gateway proxy heartbeat OK" },
    { service_id: "payment-service", cpu: 89.2, memory: 88.0, level: "WARN", message: "Memory usage approaching 90% threshold" },
    { service_id: "payment-service", cpu: 94.5, memory: 91.8, level: "ERROR", message: "HTTP 500 internal server error during database commit" },
    { service_id: "payment-service", cpu: 95.8, memory: 92.5, level: "CRITICAL", message: "Circuit breaker tripped after 10 consecutive timeouts" }
  ], null, 2)
}

export default function DemoPage() {
  const [runningScenario, setRunningScenario] = useState(null)
  const [scenarioResult, setScenarioResult] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [showQAModal, setShowQAModal] = useState(false)
  const [toast, setToast] = useState(null)

  // Upload state
  const [uploadText, setUploadText] = useState('')
  const [fileName, setFileName] = useState('sample-telemetry.log')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  const showNotification = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleRunScenario = async (scenarioKey) => {
    try {
      setRunningScenario(scenarioKey)
      setScenarioResult(null)
      const res = await api.triggerDemoScenario(scenarioKey)
      setScenarioResult(res)
      showNotification(`${res.scenario} executed successfully!`)
    } catch (err) {
      showNotification(`Scenario execution failed: ${err.message}`, 'error')
    } finally {
      setRunningScenario(null)
    }
  }

  const handleResetEnvironment = async () => {
    try {
      setResetting(true)
      await api.resetDemoEnvironment()
      setScenarioResult(null)
      showNotification('Demo environment restored to healthy baseline!')
    } catch (err) {
      showNotification(`Reset failed: ${err.message}`, 'error')
    } finally {
      setResetting(false)
    }
  }

  const handleFileUpload = async () => {
    if (!uploadText.trim()) {
      showNotification('Please provide or paste telemetry content.', 'error')
      return
    }

    try {
      setUploadLoading(true)
      const res = await api.uploadTelemetryFile({
        filename: fileName,
        content: uploadText,
      })
      setUploadResult(res)
      showNotification(`Successfully processed ${res.total_rows_parsed} offline telemetry records!`)
    } catch (err) {
      showNotification(`Processing failed: ${err.message}`, 'error')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleLoadSample = (type) => {
    if (type === 'log') {
      setFileName('payment-service-errors.log')
      setUploadText(SAMPLE_FILES.log)
    } else if (type === 'csv') {
      setFileName('server-telemetry-spike.csv')
      setUploadText(SAMPLE_FILES.csv)
    } else if (type === 'json') {
      setFileName('microservice-events.json')
      setUploadText(SAMPLE_FILES.json)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-2xl transition-all border ${
            toast.type === 'error'
              ? 'bg-accent-red/90 text-white border-accent-red'
              : 'bg-accent-green/90 text-white border-accent-green'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Professor Defense Q&A Modal */}
      <ProfessorQAModal isOpen={showQAModal} onClose={() => setShowQAModal(false)} />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-accent-blue/20 text-accent-blue border border-accent-blue/30 tracking-wider">
              PHASE 7 LIVE DEMONSTRATION HUB
            </span>
            <span className="text-xs text-text-dim">End-to-End Autonomous Pipeline</span>
          </div>
          <h2 className="text-xl font-bold font-heading text-text-primary tracking-tight">
            Failure Scenarios & Offline Telemetry Console
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            Execute 5 realistic production failure scenarios or analyze offline telemetry files (.log, .csv, .json)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQAModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-bg-secondary hover:bg-border-default text-text-primary border border-border-default transition"
          >
            <IconDefense className="w-3.5 h-3.5 text-accent-blue" />
            <span>Defense Q&A</span>
          </button>
          <button
            onClick={handleResetEnvironment}
            disabled={resetting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-accent-green/20 text-accent-green border border-accent-green/40 hover:bg-accent-green/30 transition"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span>{resetting ? 'Resetting...' : 'Reset Baseline'}</span>
          </button>
        </div>
      </div>

      {/* Pipeline Sequence Banner */}
      <div className="rounded-xl border border-border-default bg-bg-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-heading text-accent-blue uppercase tracking-wider flex items-center gap-1.5">
            <IconActivity className="w-3.5 h-3.5" />
            <span>DEVSIGHTAI Complete Autonomous Intelligence Loop</span>
          </span>
          <span className="text-[10px] text-text-dim font-mono">Groq LPU + scikit-learn + Pandas</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono font-semibold text-text-secondary pt-1">
          {['Observe', 'Detect', 'Correlate', 'Explain', 'Predict', 'Recommend', 'Resolve'].map((step, idx, arr) => (
            <div key={step} className="flex items-center gap-1.5 sm:gap-2">
              <span className="px-2 py-1 rounded bg-bg-secondary border border-border-default text-text-primary">
                {step}
              </span>
              {idx < arr.length - 1 && <span className="text-accent-blue font-bold">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Active Scenario Pipeline Execution Visualizer */}
      {scenarioResult && (
        <div className="rounded-xl border border-accent-blue/40 bg-gradient-to-br from-bg-elevated via-bg-card to-accent-blue/10 p-5 space-y-4 animate-fade-in shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-border-default">
            <div>
              <span className="text-[10px] font-bold font-heading text-accent-blue uppercase tracking-wider block">
                Active Execution Result
              </span>
              <h3 className="text-base font-bold font-heading text-text-primary">
                {scenarioResult.scenario}
              </h3>
            </div>
            <button
              onClick={() => setScenarioResult(null)}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Dismiss
            </button>
          </div>

          <div className="space-y-2.5">
            {scenarioResult.pipeline_steps?.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-bg-secondary/70 border border-border-default text-xs">
                <span className="font-mono font-bold text-accent-green flex items-center gap-1.5 flex-shrink-0">
                  <IconCheck className="w-3.5 h-3.5 text-accent-green" />
                  <span>{step.step}:</span>
                </span>
                <span className="text-text-secondary leading-relaxed">{step.detail}</span>
              </div>
            ))}
          </div>

          {scenarioResult.rca && (
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
              <span className="font-bold font-heading text-amber-500 dark:text-accent-yellow flex items-center gap-1.5 uppercase">
                <IconAlertOctagon className="w-3.5 h-3.5 text-amber-500" />
                <span>Instant Groq Root Cause Synthesis:</span>
              </span>
              <p className="text-text-secondary leading-relaxed">{scenarioResult.rca.root_cause}</p>
            </div>
          )}
        </div>
      )}

      {/* 5 Live Failure Scenarios Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold font-heading uppercase tracking-wider text-text-muted px-1">
          Select & Inject Live Production Failure Scenario
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SCENARIOS.map((sc) => {
            const isRunning = runningScenario === sc.key
            const ScIcon = sc.icon

            return (
              <div
                key={sc.key}
                className="rounded-xl border border-border-default bg-bg-card p-4 space-y-3 flex flex-col justify-between hover:border-text-muted transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-8 h-8 rounded-lg bg-bg-secondary flex items-center justify-center text-accent-blue border border-border-default">
                      <ScIcon className="w-4 h-4" />
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.badge}`}>
                      {sc.severity}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold font-heading text-text-primary leading-snug">
                      {sc.title}
                    </h4>
                    <span className="text-[11px] font-medium text-accent-blue block mt-0.5">
                      {sc.subtitle}
                    </span>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">
                    {sc.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-border-default/60 space-y-2">
                  <button
                    onClick={() => handleRunScenario(sc.key)}
                    disabled={isRunning}
                    className="w-full py-2 text-xs font-bold rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 transition shadow-md shadow-accent-blue/20 flex items-center justify-center gap-1.5"
                  >
                    <IconPlay className="w-3.5 h-3.5" />
                    <span>{isRunning ? 'Injecting...' : 'Inject Failure Live'}</span>
                  </button>
                  <Link
                    to={sc.targetLink}
                    className="block text-center text-[11px] text-text-secondary hover:text-accent-blue transition"
                  >
                    {sc.targetLabel}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Multi-Format Offline Telemetry Uploader (.log, .csv, .json) */}
      <div className="rounded-xl border border-border-default bg-bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-border-default">
          <div>
            <h3 className="text-sm font-bold font-heading text-text-primary flex items-center gap-2">
              <IconFileText className="w-4 h-4 text-accent-blue" />
              <span>Multi-Format Offline Telemetry Ingestion</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-secondary text-accent-blue border border-accent-blue/30 font-bold">
                .log • .csv • .json
              </span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Run the full IsolationForest ML and regex classification pipeline on offline log files without a live agent
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-dim uppercase font-semibold">Sample Presets:</span>
            <button
              onClick={() => handleLoadSample('log')}
              className="px-2 py-1 text-[11px] font-medium rounded bg-bg-secondary hover:bg-border-default text-text-secondary"
            >
              .log
            </button>
            <button
              onClick={() => handleLoadSample('csv')}
              className="px-2 py-1 text-[11px] font-medium rounded bg-bg-secondary hover:bg-border-default text-text-secondary"
            >
              .csv
            </button>
            <button
              onClick={() => handleLoadSample('json')}
              className="px-2 py-1 text-[11px] font-medium rounded bg-bg-secondary hover:bg-border-default text-text-secondary"
            >
              .json
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="flex-1 rounded-lg border border-border-default bg-bg-secondary px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-blue"
              placeholder="Filename (e.g. server-telemetry.log)"
            />
            <button
              onClick={handleFileUpload}
              disabled={uploadLoading}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 transition shadow-md shadow-accent-blue/20 flex items-center gap-1.5"
            >
              <IconPlay className="w-3.5 h-3.5" />
              <span>{uploadLoading ? 'Analyzing...' : 'Execute ML Pipeline'}</span>
            </button>
          </div>

          <textarea
            rows={5}
            value={uploadText}
            onChange={(e) => setUploadText(e.target.value)}
            className="w-full rounded-xl border border-border-default bg-bg-primary p-3 text-xs font-mono text-text-secondary focus:outline-none focus:border-accent-blue resize-none"
            placeholder="Paste telemetry lines or select a sample preset above..."
          />
        </div>

        {/* Upload Results Viewer */}
        {uploadResult && (
          <div className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-border-default">
              <span className="text-xs font-bold text-text-primary">
                Analysis Results for <code className="text-accent-blue">{uploadResult.filename}</code>
              </span>
              <span className="text-[10px] text-text-dim font-mono">
                {uploadResult.pipeline_applied}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-bg-primary">
                <span className="text-[10px] text-text-muted block">Records Parsed</span>
                <span className="text-base font-bold text-text-primary">{uploadResult.total_rows_parsed}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-primary">
                <span className="text-[10px] text-text-muted block">Anomalies Detected</span>
                <span className="text-base font-bold text-accent-red">{uploadResult.anomalies_flagged} ({uploadResult.anomaly_percentage}%)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-primary">
                <span className="text-[10px] text-text-muted block">Errors & Critical</span>
                <span className="text-base font-bold text-amber-400">
                  {(uploadResult.log_level_breakdown?.ERROR || 0) + (uploadResult.log_level_breakdown?.CRITICAL || 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-bg-primary">
                <span className="text-[10px] text-text-muted block">Info Records</span>
                <span className="text-base font-bold text-accent-green">{uploadResult.log_level_breakdown?.INFO || 0}</span>
              </div>
            </div>

            <p className="text-xs text-text-secondary bg-bg-elevated p-3 rounded-lg border border-border-default leading-relaxed">
              <strong>Insight:</strong> {uploadResult.summary_insight}
            </p>

            {uploadResult.sample_rows && uploadResult.sample_rows.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase block">Parsed Telemetry Sample:</span>
                <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-[11px] pr-1">
                  {uploadResult.sample_rows.map((row, ri) => (
                    <div
                      key={ri}
                      className={`flex items-center justify-between p-2 rounded border ${
                        row.is_anomaly
                          ? 'border-accent-red/40 bg-accent-red/10 text-accent-red'
                          : 'border-border-default/60 bg-bg-primary text-text-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[10px] font-bold px-1 rounded bg-bg-secondary text-text-muted">
                          #{row.index}
                        </span>
                        <span className="font-bold text-[10px] uppercase">{row.level}</span>
                        <span className="truncate">{row.message}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 text-[10px]">
                        <span>CPU: {row.cpu}%</span>
                        {row.is_anomaly && (
                          <span className="px-1.5 py-0.2 rounded bg-accent-red text-white font-bold">
                            ANOMALY
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
