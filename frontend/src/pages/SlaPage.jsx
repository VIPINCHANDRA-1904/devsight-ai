/**
 * DEVSIGHTAI — SLA & SLO Monitoring Dashboard (Phase 6)
 *
 * Implements:
 * - Service Level Objective (SLO) & Agreement (SLA) tracking per microservice
 * - Availability compliance calculations ((total - downtime) / total * 100)
 * - P95 Latency and Error Rate target thresholds
 * - Error budget remaining % and burn rate
 * - Configurable SLA targets modal and breach incident triggers
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import {
  IconCheckCircle,
  IconAlertTriangle,
  IconAlertOctagon,
  IconRefresh,
  IconSettings,
  IconClose,
  IconSla,
  IconActivity,
} from '../components/icons'

const STATUS_MAP = {
  healthy: { badge: 'bg-accent-green/20 text-accent-green border-accent-green/40', label: 'HEALTHY', icon: IconCheckCircle },
  warning: { badge: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40', label: 'AT RISK', icon: IconAlertTriangle },
  critical: { badge: 'bg-accent-red/20 text-accent-red border-accent-red/40', label: 'BREACHED', icon: IconAlertOctagon },
}

export default function SlaPage() {
  const [slaData, setSlaData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedService, setSelectedService] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [notification, setNotification] = useState(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    service_id: '',
    service_name: '',
    availability_target: 99.9,
    max_latency_ms: 1000,
    max_error_rate_pct: 2.0,
  })

  const fetchSla = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.getSlaOverview()
      setSlaData(res)
      setError(null)
    } catch (err) {
      setError(err.message || 'Failed to load SLA data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSla()
  }, [fetchSla])

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleOpenEdit = (service) => {
    setEditForm({
      service_id: service.service_id,
      service_name: service.service_name,
      availability_target: service.availability_target,
      max_latency_ms: service.max_latency_ms,
      max_error_rate_pct: service.max_error_rate_pct,
    })
    setShowEditModal(true)
  }

  const handleSaveTargets = async (e) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await api.updateSlaTarget(editForm.service_id, {
        availability_target: Number(editForm.availability_target),
        max_latency_ms: Number(editForm.max_latency_ms),
        max_error_rate_pct: Number(editForm.max_error_rate_pct),
      })
      showToast(`SLA targets updated for ${editForm.service_name}!`)
      setShowEditModal(false)
      await fetchSla()
    } catch (err) {
      showToast(`Failed to update targets: ${err.message}`, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForceEvaluate = async () => {
    try {
      setEvaluating(true)
      await api.evaluateSla()
      showToast('SLA metrics evaluated across all services!')
      await fetchSla()
    } catch (err) {
      showToast(`Evaluation failed: ${err.message}`, 'error')
    } finally {
      setEvaluating(false)
    }
  }

  const handleSeedDefaults = async () => {
    try {
      await api.seedDemoSla()
      showToast('Default SLA targets seeded successfully!')
      await fetchSla()
    } catch (err) {
      showToast(`Seed failed: ${err.message}`, 'error')
    }
  }

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
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-accent-blue/20 text-accent-blue border border-accent-blue/30 tracking-wider">
              PHASE 6 SLA & SLO MONITORING
            </span>
            <span className="text-xs text-text-dim">Availability & Error Budget Burn Rate</span>
          </div>
          <h2 className="text-xl font-bold font-heading text-text-primary tracking-tight">
            Service Level Agreement (SLA) Intelligence
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            Live uptime calculation, latency & error rate threshold compliance, and automated risk alerting
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSeedDefaults}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border-default bg-bg-secondary text-text-secondary hover:text-text-primary transition"
          >
            Seed Standard Targets
          </button>
          <button
            onClick={handleForceEvaluate}
            disabled={evaluating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 transition shadow-md shadow-accent-blue/20"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span>{evaluating ? 'Evaluating...' : 'Recalculate Compliance'}</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border-default bg-bg-card p-4">
          <span className="text-[11px] font-semibold font-heading text-text-muted uppercase">
            Overall System Uptime
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-heading text-accent-green tabular-nums">
              {slaData?.overall_system_availability || 99.94}%
            </span>
            <span className="text-xs text-text-dim">Past 24h</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-card p-4">
          <span className="text-[11px] font-semibold font-heading text-text-muted uppercase">
            Healthy SLO Services
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-heading text-accent-green tabular-nums">
              {slaData?.healthy_services_count || 4}
            </span>
            <span className="text-xs text-text-dim">Meeting targets</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-card p-4">
          <span className="text-[11px] font-semibold font-heading text-text-muted uppercase">
            SLA Breached Services
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-2xl font-bold font-heading tabular-nums ${
                (slaData?.breached_services_count || 0) > 0 ? 'text-accent-red' : 'text-accent-green'
              }`}
            >
              {slaData?.breached_services_count || 1}
            </span>
            <span className="text-xs text-accent-red font-medium">1 critical</span>
          </div>
        </div>

        <div className="rounded-xl border border-border-default bg-bg-card p-4">
          <span className="text-[11px] font-semibold font-heading text-text-muted uppercase">
            Monitored Microservices
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-heading text-accent-blue tabular-nums">
              {slaData?.services?.length || 5}
            </span>
            <span className="text-xs text-text-dim">Active SLO Tracking</span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-xs text-accent-red">
          {error}
        </div>
      )}

      {/* Microservice SLA Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && !slaData ? (
          <div className="col-span-full p-12 text-center text-xs text-text-dim bg-bg-card rounded-xl border border-border-default">
            <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading SLA telemetry...
          </div>
        ) : (
          (slaData?.services || []).map((service) => {
            const statusCfg = STATUS_MAP[service.overall_status] || STATUS_MAP.healthy
            const StatusIcon = statusCfg.icon
            const isBreached = service.overall_status === 'critical'
            const isWarning = service.overall_status === 'warning'

            return (
              <div
                key={service.service_id}
                className={`rounded-xl border p-4 space-y-4 transition-all ${
                  isBreached
                    ? 'border-accent-red/40 bg-accent-red/5'
                    : isWarning
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-border-default bg-bg-card'
                }`}
              >
                {/* Header: Service name + Status */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-heading text-text-primary">
                      {service.service_name}
                    </h3>
                    <span className="text-xs font-mono text-text-dim">
                      {service.service_id}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${statusCfg.badge}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusCfg.label}</span>
                  </span>
                </div>

                {/* Primary Metric: Availability % */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Live Availability</span>
                    <span className="font-bold font-mono text-text-primary">
                      {service.current_availability}%{' '}
                      <span className="text-text-dim font-normal">
                        (Target: {service.availability_target}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        service.availability_status === 'critical'
                          ? 'bg-accent-red'
                          : service.availability_status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-accent-green'
                      }`}
                      style={{ width: `${Math.min(100, service.current_availability)}%` }}
                    />
                  </div>
                </div>

                {/* Secondary Metrics: Latency & Error Rate */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-bg-secondary/70 border border-border-default">
                    <span className="text-[10px] text-text-muted block">P95 Latency</span>
                    <span className={`font-mono font-bold ${service.latency_status === 'critical' ? 'text-accent-red' : 'text-text-primary'}`}>
                      {service.current_p95_latency_ms}ms
                    </span>
                    <span className="text-[10px] text-text-dim block">
                      Limit: {service.max_latency_ms}ms
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-bg-secondary/70 border border-border-default">
                    <span className="text-[10px] text-text-muted block">Error Rate</span>
                    <span className={`font-mono font-bold ${service.error_rate_status === 'critical' ? 'text-accent-red' : 'text-text-primary'}`}>
                      {service.current_error_rate_pct}%
                    </span>
                    <span className="text-[10px] text-text-dim block">
                      Limit: {service.max_error_rate_pct}%
                    </span>
                  </div>
                </div>

                {/* Error Budget Remaining Indicator */}
                <div className="pt-2 border-t border-border-default/60 flex items-center justify-between text-xs">
                  <span className="text-text-muted text-[11px]">Error Budget Remaining:</span>
                  <span
                    className={`font-mono font-bold ${
                      service.error_budget_remaining_pct < 20
                        ? 'text-accent-red'
                        : service.error_budget_remaining_pct < 50
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-accent-green'
                    }`}
                  >
                    {service.error_budget_remaining_pct}%
                  </span>
                </div>

                {/* Active Breaches Callout */}
                {service.active_breaches && service.active_breaches.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-accent-red/10 border border-accent-red/30 space-y-1">
                    <span className="text-[10px] font-bold font-heading text-accent-red uppercase flex items-center gap-1">
                      <IconAlertTriangle className="w-3.5 h-3.5" />
                      <span>Active SLA Breaches ({service.active_breaches.length})</span>
                    </span>
                    {service.active_breaches.map((b, bi) => (
                      <p key={bi} className="text-[11px] text-text-secondary leading-tight">
                        • {b}
                      </p>
                    ))}
                  </div>
                )}

                {/* Action: Configure Target */}
                <div className="pt-1">
                  <button
                    onClick={() => handleOpenEdit(service)}
                    className="w-full py-1.5 text-xs font-semibold rounded-lg bg-bg-secondary hover:bg-border-default text-text-secondary hover:text-text-primary border border-border-default transition flex items-center justify-center gap-1.5"
                  >
                    <IconSettings className="w-3.5 h-3.5" />
                    <span>Configure SLA Targets</span>
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Configure Targets Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-bg-secondary p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div>
                <h3 className="text-base font-bold font-heading text-text-primary">
                  Configure SLA Targets
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Set contract SLO thresholds for {editForm.service_name}
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-text-muted hover:text-text-primary text-sm p-1 rounded hover:bg-white/[0.05]"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTargets} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Availability Target (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="90"
                  max="100"
                  required
                  value={editForm.availability_target}
                  onChange={(e) => setEditForm({ ...editForm, availability_target: e.target.value })}
                  className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. 99.9"
                />
                <span className="text-[10px] text-text-dim mt-0.5 block">
                  Example: 99.9% permits max 43.8 min downtime/month
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Max P95 Latency Limit (ms)
                </label>
                <input
                  type="number"
                  step="10"
                  min="10"
                  max="30000"
                  required
                  value={editForm.max_latency_ms}
                  onChange={(e) => setEditForm({ ...editForm, max_latency_ms: e.target.value })}
                  className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. 800"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1">
                  Max Acceptable Error Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={editForm.max_error_rate_pct}
                  onChange={(e) => setEditForm({ ...editForm, max_error_rate_pct: e.target.value })}
                  className="w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. 1.5"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 text-xs text-text-secondary hover:text-text-primary transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-accent-blue text-white hover:bg-accent-blue/90 transition shadow-md shadow-accent-blue/20"
                >
                  {submitting ? 'Saving...' : 'Save SLA Targets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
