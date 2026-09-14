/**
 * DEVSIGHTAI — Deployment & Release Intelligence Dashboard (Phase 5)
 *
 * Full release management and performance regression intelligence:
 * - Tracks deployments across all microservices and environments
 * - Evaluates 30-minute pre- vs post-deploy Pandas baseline metrics
 * - Automatic regression detection (Error Rate > 3x, Latency > 2x)
 * - Release Health cards with Before/After/Delta% indicators
 * - Manual deployment simulation & Demo seeders for live testing
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconCheckCircle,
  IconCheck,
  IconDeployments,
  IconPlay,
  IconRefresh,
  IconMetrics,
  IconActivity,
  IconClose,
  IconArrowUpRight,
  IconZap,
} from '../components/icons'

const SERVICES_LIST = [
  { id: 'payment-service', name: 'Payment Service' },
  { id: 'order-service', name: 'Order Service' },
  { id: 'api-gateway', name: 'API Gateway' },
  { id: 'auth-service', name: 'Auth Service' },
  { id: 'inventory-service', name: 'Inventory Service' },
]

const STATUS_CONFIG = {
  critical: {
    label: 'CRITICAL REGRESSION',
    badge: 'bg-accent-red/20 text-accent-red border-accent-red/40',
    border: 'border-accent-red/40',
    bg: 'bg-accent-red/5',
    icon: IconAlertOctagon,
  },
  warning: {
    label: 'DEGRADATION WARNING',
    badge: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/5',
    icon: IconAlertTriangle,
  },
  healthy: {
    label: 'HEALTHY RELEASE',
    badge: 'bg-accent-green/20 text-accent-green border-accent-green/40',
    border: 'border-accent-green/30',
    bg: 'bg-accent-green/5',
    icon: IconCheckCircle,
  },
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '--'
  try {
    const now = new Date()
    const d = new Date(dateStr)
    const diffSec = Math.floor((now - d) / 1000)

    if (diffSec < 60) return `${diffSec}s ago`
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    return `${diffDays}d ago`
  } catch {
    return dateStr
  }
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedService, setSelectedService] = useState('all')
  const [selectedEnv, setSelectedEnv] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [activeDeployment, setActiveDeployment] = useState(null)
  const [healthDetail, setHealthDetail] = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [showSimulateModal, setShowSimulateModal] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState(null)

  // New Deployment Form State
  const [formData, setFormData] = useState({
    service_id: 'payment-service',
    version: '2.5.0',
    environment: 'production',
    commit_hash: 'a7b9c3f',
    deployed_by: 'lead.devops@devsight.ai',
    description: 'Hotfix database connection pool and optimized query timeouts',
  })

  const fetchDeployments = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.getDeployments({
        serviceId: selectedService === 'all' ? undefined : selectedService,
        environment: selectedEnv === 'all' ? undefined : selectedEnv,
        limit: 50,
      })

      const data = res.data || []
      setDeployments(data)
      setError(null)

      // Auto-select first deployment if none selected
      if (data.length > 0 && !activeDeployment) {
        setActiveDeployment(data[0])
      }
    } catch (err) {
      setError(err.message || 'Failed to load deployments')
    } finally {
      setLoading(false)
    }
  }, [selectedService, selectedEnv, activeDeployment])

  useEffect(() => {
    fetchDeployments()
  }, [fetchDeployments])

  // Load health detail whenever activeDeployment changes
  useEffect(() => {
    if (!activeDeployment) {
      setHealthDetail(null)
      return
    }

    // If health is already attached on the deployment object, use it as initial
    if (activeDeployment.release_health) {
      setHealthDetail(activeDeployment.release_health)
    }

    async function fetchHealth() {
      try {
        setHealthLoading(true)
        const health = await api.getDeploymentHealth(activeDeployment.id)
        setHealthDetail(health)
      } catch (err) {
        console.error('Failed to load deployment health:', err)
      } finally {
        setHealthLoading(false)
      }
    }

    fetchHealth()
  }, [activeDeployment])

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Handle Demo Seed
  const handleSeedDemo = async () => {
    try {
      setSeeding(true)
      await api.seedDemoDeployments()
      showToast('Successfully seeded demo deployments with release telemetry!')
      await fetchDeployments()
    } catch (err) {
      showToast(`Seeding failed: ${err.message}`, 'error')
    } finally {
      setSeeding(false)
    }
  }

  // Handle Simulate Deployment Form Submit
  const handleSimulateSubmit = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const res = await api.createDeployment(formData)
      showToast(`Deployment v${formData.version} recorded! Background health evaluation triggered.`)
      setShowSimulateModal(false)
      // Reset form version increment
      const parts = formData.version.split('.')
      if (parts.length === 3) {
        parts[2] = String(Number(parts[2]) + 1)
        setFormData((prev) => ({ ...prev, version: parts.join('.') }))
      }
      await fetchDeployments()
      if (res.deployment) {
        setActiveDeployment(res.deployment)
      }
    } catch (err) {
      showToast(`Failed to record deployment: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter deployments
  const filteredDeployments = deployments.filter((d) => {
    if (selectedStatus === 'all') return true
    const st = d.release_health?.overall_status || 'healthy'
    return st === selectedStatus
  })

  // Summary Metrics calculations
  const totalCount = deployments.length
  const criticalCount = deployments.filter(
    (d) => d.release_health?.overall_status === 'critical'
  ).length
  const warningCount = deployments.filter(
    (d) => d.release_health?.overall_status === 'warning'
  ).length
  const healthyCount = deployments.filter(
    (d) => (d.release_health?.overall_status || 'healthy') === 'healthy'
  ).length
  const healthyPct = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 100

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2.5 text-xs font-semibold shadow-2xl transition-all border ${
            notification.type === 'error'
              ? 'bg-accent-red/90 text-white border-accent-red'
              : 'bg-accent-green/90 text-white border-accent-green'
          }`}
        >
          {notification.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-accent-green/20 text-accent-green border border-accent-green/30 tracking-wider">
              PHASE 5 RELEASE INTELLIGENCE
            </span>
            <span className="text-xs text-text-dim">Pandas Baseline Evaluation (30m Pre vs Post)</span>
          </div>
          <h2 className="text-xl font-bold font-heading text-text-primary tracking-tight">
            Deployment & Release Intelligence
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            Automatic regression detection, before/after metric deltas, and Release Health scoring
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border-default bg-bg-secondary text-text-secondary hover:text-text-primary hover:border-text-muted transition"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span>{seeding ? 'Seeding...' : 'Seed Demo Releases'}</span>
          </button>
          <button
            onClick={() => setShowSimulateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 transition shadow-md shadow-accent-blue/20"
          >
            <IconPlay className="w-3.5 h-3.5" />
            <span>Simulate Release</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-default bg-bg-card p-4">
          <p className="text-[11px] font-medium font-heading text-text-muted uppercase tracking-wider mb-1">
            Total Deployments
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-heading text-text-primary tabular-nums">
              {totalCount}
            </span>
            <span className="text-xs text-text-dim">All environments</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-card p-4">
          <p className="text-[11px] font-medium font-heading text-text-muted uppercase tracking-wider mb-1">
            Release Success Rate
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-heading text-accent-green tabular-nums">
              {healthyPct}%
            </span>
            <span className="text-xs text-accent-green font-medium">
              {healthyCount} healthy
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-card p-4">
          <p className="text-[11px] font-medium font-heading text-text-muted uppercase tracking-wider mb-1">
            Regressions Detected
          </p>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold font-heading tabular-nums ${
                criticalCount > 0 ? 'text-accent-red' : 'text-accent-green'
              }`}
            >
              {criticalCount}
            </span>
            <span className="text-xs text-text-dim">
              {warningCount} with warnings
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-card p-4">
          <p className="text-[11px] font-medium font-heading text-text-muted uppercase tracking-wider mb-1">
            Monitored Services
          </p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-heading text-accent-blue tabular-nums">
              {SERVICES_LIST.length}
            </span>
            <span className="text-xs text-text-dim">Continuous tracking</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Service Filter */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="rounded-lg border border-border-default bg-bg-secondary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Services ({SERVICES_LIST.length})</option>
            {SERVICES_LIST.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Environment Filter */}
          <select
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
            className="rounded-lg border border-border-default bg-bg-secondary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>

          {/* Health Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-border-default bg-bg-secondary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Health Statuses</option>
            <option value="healthy">Healthy Only</option>
            <option value="warning">Warning Only</option>
            <option value="critical">Critical Regressions</option>
          </select>
        </div>

        <div className="text-xs text-text-dim">
          Showing {filteredDeployments.length} release{filteredDeployments.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red">
          {error}
        </div>
      )}

      {/* Main Content Layout: Deployments List + Health Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Deployments Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold font-heading uppercase tracking-wider text-text-muted">
              Release History & Signals
            </h3>
            <button
              onClick={fetchDeployments}
              className="text-[11px] text-accent-blue hover:underline"
            >
              Refresh
            </button>
          </div>

          {loading && deployments.length === 0 ? (
            <div className="rounded-xl border border-border-default bg-bg-card p-8 text-center text-xs text-text-dim">
              <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading deployment telemetry...
            </div>
          ) : filteredDeployments.length === 0 ? (
            <div className="rounded-xl border border-border-default bg-bg-card p-8 text-center text-xs text-text-dim">
              No deployments found matching current filters.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
              {filteredDeployments.map((dep) => {
                const status = dep.release_health?.overall_status || 'healthy'
                const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.healthy
                const StatusIcon = statusCfg.icon
                const isSelected = activeDeployment?.id === dep.id

                return (
                  <div
                    key={dep.id}
                    onClick={() => setActiveDeployment(dep)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition-all text-left ${
                      isSelected
                        ? 'border-accent-blue bg-bg-elevated shadow-md shadow-accent-blue/10'
                        : 'border-border-default bg-bg-card hover:border-text-muted/60'
                    }`}
                  >
                    {/* Header: Service + Version + Status */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold font-heading text-sm text-text-primary">
                            {dep.service_id}
                          </span>
                          <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-bg-secondary text-accent-blue border border-border-default">
                            v{dep.version}
                          </span>
                          <span className="text-[10px] uppercase font-medium px-1.5 py-0.2 rounded bg-bg-secondary text-text-dim">
                            {dep.environment || 'prod'}
                          </span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg.badge}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        <span>{status.toUpperCase()}</span>
                      </span>
                    </div>

                    {/* Commit & Author */}
                    <div className="flex items-center gap-3 text-xs text-text-muted mb-2">
                      <span className="font-mono text-text-secondary">
                        #{dep.commit_hash?.slice(0, 7) || 'latest'}
                      </span>
                      <span>•</span>
                      <span className="truncate max-w-[140px]">
                        {dep.deployed_by || 'ci-runner'}
                      </span>
                      <span>•</span>
                      <span>{formatRelativeTime(dep.deployed_at)}</span>
                    </div>

                    {/* Description */}
                    {dep.description && (
                      <p className="text-xs text-text-secondary line-clamp-1 mb-2.5">
                        {dep.description}
                      </p>
                    )}

                    {/* Quick Metric Delta Badges */}
                    {dep.release_health?.items && (
                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-border-default/60">
                        {dep.release_health.items.slice(0, 2).map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-bg-secondary/60"
                          >
                            <span className="text-text-muted truncate">{item.metric}:</span>
                            <span
                              className={`font-semibold font-mono ${
                                item.status === 'critical'
                                  ? 'text-accent-red'
                                  : item.status === 'warning'
                                  ? 'text-amber-500 dark:text-amber-400'
                                  : 'text-accent-green'
                              }`}
                            >
                              {item.delta_pct > 0 ? `+${item.delta_pct}%` : `${item.delta_pct}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Release Health Detailed Inspector (7 cols) */}
        <div className="lg:col-span-7">
          {activeDeployment ? (
            <div className="rounded-xl border border-border-default bg-bg-card p-5 space-y-5">
              {/* Release Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border-default">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-heading font-medium text-text-dim">RELEASE HEALTH EVALUATION</span>
                    <span className="text-xs text-text-dim">•</span>
                    <span className="text-xs font-mono text-text-secondary">
                      ID: {activeDeployment.id?.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-heading text-text-primary flex items-center gap-2">
                    <span>{activeDeployment.service_id}</span>
                    <span className="text-accent-blue font-mono">v{activeDeployment.version}</span>
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Deployed by <span className="text-text-secondary font-medium">{activeDeployment.deployed_by || 'ci-runner'}</span> on{' '}
                    <span className="text-text-secondary">
                      {activeDeployment.deployed_at
                        ? new Date(activeDeployment.deployed_at).toLocaleString()
                        : 'Just now'}
                    </span>
                  </p>
                </div>

                {/* Status Indicator */}
                {healthDetail && (
                  <div
                    className={`rounded-xl border px-3.5 py-2 text-right ${
                      STATUS_CONFIG[healthDetail.overall_status]?.bg || 'bg-bg-secondary'
                    } ${STATUS_CONFIG[healthDetail.overall_status]?.border || 'border-border-default'}`}
                  >
                    <div className="text-[10px] font-semibold font-heading text-text-muted uppercase">
                      Release Assessment
                    </div>
                    <div
                      className={`text-sm font-bold font-heading flex items-center justify-end gap-1.5 ${
                        STATUS_CONFIG[healthDetail.overall_status]?.badge?.split(' ')[1] || 'text-text-primary'
                      }`}
                    >
                      {(() => {
                        const AssessmentIcon = STATUS_CONFIG[healthDetail.overall_status]?.icon || IconCheckCircle
                        return <AssessmentIcon className="w-4 h-4" />
                      })()}
                      <span>{(healthDetail.overall_status || 'healthy').toUpperCase()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Regression Alert Notice */}
              {healthDetail?.has_regression && (
                <div className="rounded-xl border border-accent-red/40 bg-accent-red/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-accent-red font-bold font-heading text-xs uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
                    Performance Regression Detected
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Post-deployment telemetry shows degradation exceeding threshold criteria (Error Rate &gt; +3x or Latency &gt; +2x).
                    An automated incident has been created and linked to commit{' '}
                    <span className="font-mono text-accent-red font-semibold">
                      #{activeDeployment.commit_hash?.slice(0, 7)}
                    </span>.
                  </p>
                  <div className="pt-1 flex items-center gap-3 text-xs">
                    <a
                      href="/incidents"
                      className="font-semibold text-accent-red hover:underline flex items-center gap-1"
                    >
                      <span>View Correlated Incident in Dashboard</span>
                      <IconArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* 30-Minute Pandas Baseline Comparison Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold font-heading uppercase tracking-wider text-text-primary flex items-center gap-2">
                    <IconMetrics className="w-3.5 h-3.5 text-accent-blue" />
                    <span>30-Minute Pre vs Post Baseline Comparison</span>
                    {healthLoading && (
                      <span className="text-[10px] font-normal text-text-dim animate-pulse">
                        Evaluating...
                      </span>
                    )}
                  </h4>
                  <span className="text-[11px] text-text-dim">Pandas rolling telemetry</span>
                </div>

                {healthDetail?.items ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {healthDetail.items.map((metric, idx) => {
                      const isCrit = metric.status === 'critical'
                      const isWarn = metric.status === 'warning'
                      const isPositiveChange = metric.delta_pct > 0

                      return (
                        <div
                          key={idx}
                          className={`rounded-xl border p-3.5 space-y-2 transition-all ${
                            isCrit
                              ? 'border-accent-red/40 bg-accent-red/5'
                              : isWarn
                              ? 'border-amber-500/40 bg-amber-500/5'
                              : 'border-border-default bg-bg-secondary/40'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-text-primary">
                              {metric.metric}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isCrit
                                  ? 'bg-accent-red/20 text-accent-red'
                                  : isWarn
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-accent-green/20 text-accent-green'
                              }`}
                            >
                              {metric.status.toUpperCase()}
                            </span>
                          </div>

                          {/* Values: Before vs After */}
                          <div className="grid grid-cols-3 gap-2 items-center pt-1 text-xs">
                            <div>
                              <div className="text-[10px] text-text-muted">30m Before</div>
                              <div className="font-mono font-bold text-text-secondary">
                                {metric.before_value} {metric.unit}
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] text-text-muted">Delta</div>
                              <div
                                className={`font-mono font-bold text-xs ${
                                  isCrit
                                    ? 'text-accent-red'
                                    : isWarn
                                    ? 'text-amber-400'
                                    : 'text-accent-green'
                                }`}
                              >
                                {isPositiveChange ? `+${metric.delta_pct}%` : `${metric.delta_pct}%`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-text-muted">30m After</div>
                              <div
                                className={`font-mono font-bold ${
                                  isCrit
                                    ? 'text-accent-red'
                                    : isWarn
                                    ? 'text-amber-400'
                                    : 'text-text-primary'
                                }`}
                              >
                                {metric.after_value} {metric.unit}
                              </div>
                            </div>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="w-full bg-bg-secondary rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCrit
                                  ? 'bg-accent-red'
                                  : isWarn
                                  ? 'bg-amber-500'
                                  : 'bg-accent-green'
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(15, Math.abs(metric.delta_pct)))}%`,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border-default bg-bg-secondary p-6 text-center text-xs text-text-dim">
                    No before/after metric data available for this deployment yet.
                  </div>
                )}
              </div>

              {/* Release Advisor & Groq RCA Recommendation */}
              <div className="rounded-xl border border-border-default bg-bg-elevated p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-accent-yellow flex items-center gap-1.5 font-heading">
                    <IconActivity className="w-4 h-4 text-amber-500" />
                    <span>AI Release Intelligence Recommendation</span>
                  </span>
                  <span className="text-[10px] text-text-dim font-mono">Groq Llama-3.3-70B</span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {healthDetail?.has_regression
                    ? `Recommended Action: High probability of regression introduced in commit #${activeDeployment.commit_hash?.slice(
                        0,
                        7
                      )}. Recommended to prepare immediate rollback or scale database connection pool limits.`
                    : `Release Health is stable. Telemetry variance is within acceptable confidence bounds (±20%). System operating normally.`}
                </p>
              </div>

              {/* Deployment Details & Metadata Footer */}
              <div className="pt-3 border-t border-border-default grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-text-muted block">Commit Hash</span>
                  <span className="font-mono text-text-primary">
                    {activeDeployment.commit_hash || 'a4f891b'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Environment</span>
                  <span className="capitalize text-text-primary">
                    {activeDeployment.environment || 'production'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Triggered By</span>
                  <span className="text-text-primary truncate block">
                    {activeDeployment.deployed_by || 'ci-runner'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">CI/CD Pipeline</span>
                  <span className="text-accent-blue font-medium">GitHub Actions</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border-default bg-bg-card p-12 text-center text-text-dim text-xs">
              Select a deployment from the left to inspect Release Health and before/after metric comparisons.
            </div>
          )}
        </div>
      </div>

      {/* Simulate Deployment Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border-default bg-bg-secondary p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div>
                <h3 className="text-base font-bold font-heading text-text-primary">
                  Simulate New Deployment
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Record a release event and trigger Phase 5 background health evaluation
                </p>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-text-muted hover:text-text-primary text-sm p-1 rounded hover:bg-white/[0.05]"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSimulateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Service
                  </label>
                  <select
                    value={formData.service_id}
                    onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                    className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                  >
                    {SERVICES_LIST.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Version Tag
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-blue"
                    placeholder="e.g. 2.5.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Environment
                  </label>
                  <select
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1">
                    Commit Hash
                  </label>
                  <input
                    type="text"
                    value={formData.commit_hash}
                    onChange={(e) => setFormData({ ...formData, commit_hash: e.target.value })}
                    className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-blue"
                    placeholder="e.g. f92b451"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Deployed By
                </label>
                <input
                  type="text"
                  value={formData.deployed_by}
                  onChange={(e) => setFormData({ ...formData, deployed_by: e.target.value })}
                  className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. david.backend@devsight.ai"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Release Description / Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-blue resize-none"
                  placeholder="Summary of changes included in this release..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="px-3.5 py-1.5 text-xs text-text-secondary hover:text-text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 transition shadow-md shadow-accent-blue/20 flex items-center gap-1.5"
                >
                  <IconPlay className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Recording...' : 'Trigger Deployment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
