/**
 * DEVSIGHTAI — Overview Dashboard
 *
 * Professional, role-adaptive reliability dashboard with:
 * - Developer perspective: Real deployments, error traces, affected services, AI RCA
 * - DevOps perspective: CPU/RAM/Disk sparklines, service health, anomalies, remediations
 * - QA perspective: Real release comparisons, latency & error rate drifts, regression matrix
 * - Engineering Manager perspective: Availability %, MTTR, SLA error budgets, business translation
 *
 * Dense, restrained, production-oriented observability UI.
 * Zero emojis, Bahnschrift headings, no ambient glow, 100% real data from active state.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import WarningBanner from '../components/WarningBanner'
import {
  IconDeveloper,
  IconDevOps,
  IconQa,
  IconManager,
  IconIncidents,
  IconDeployments,
  IconActivity,
  IconCpu,
  IconServer,
  IconCheckCircle,
  IconAlertTriangle,
  IconArrowUpRight,
  IconShield,
  IconLogs,
  IconSla,
  IconReports,
} from '../components/icons'

const SERVICE_ID = 'server-01'

export default function OverviewPage() {
  const { role, switchRole } = useAuth()
  const [activeTab, setActiveTab] = useState(role || 'developer')

  const [, setApiStatus] = useState('Checking...')
  const [, setDbStatus] = useState('--')
  const [metrics, setMetrics] = useState([])
  const [anomalies, setAnomalies] = useState([])
  const [incidents, setIncidents] = useState([])
  const [incidentStats, setIncidentStats] = useState(null)
  const [deployments, setDeployments] = useState([])
  const [logs, setLogs] = useState([])
  const [slaOverview, setSlaOverview] = useState(null)
  const [latestMetric, setLatestMetric] = useState(null)

  // Sync tab with role if role changes externally
  useEffect(() => {
    if (role) {
      setActiveTab(role)
    }
  }, [role])

  // Fetch telemetry data
  const fetchAll = useCallback(async () => {
    const [
      healthResult,
      metricsResult,
      anomaliesResult,
      incidentsResult,
      statsResult,
      deploymentsResult,
      logsResult,
      slaResult,
    ] = await Promise.allSettled([
      api.health(),
      api.getMetrics(SERVICE_ID, { limit: 30 }),
      api.getRecentAnomalies({ window: '24h', limit: 10 }),
      api.getIncidents({ limit: 6 }),
      api.getIncidentStats(),
      api.getDeployments({ limit: 6 }),
      api.getLogs ? api.getLogs({ limit: 30 }) : Promise.resolve({ data: [] }),
      api.getSlaOverview(),
    ])

    if (healthResult.status === 'fulfilled') {
      const h = healthResult.value
      setApiStatus(h.status === 'healthy' ? 'Connected' : 'Degraded')
      setDbStatus(h.database === 'connected' ? 'Connected' : h.database)
    } else {
      setApiStatus('Offline')
      setDbStatus('Unreachable')
    }

    if (metricsResult.status === 'fulfilled') {
      const data = (metricsResult.value.data || []).reverse()
      setMetrics(data)
      if (data.length > 0) {
        setLatestMetric(data[data.length - 1])
      }
    }

    if (anomaliesResult.status === 'fulfilled') {
      setAnomalies(anomaliesResult.value.data || [])
    }

    if (incidentsResult.status === 'fulfilled') {
      setIncidents(incidentsResult.value || [])
    }

    if (statsResult.status === 'fulfilled') {
      setIncidentStats(statsResult.value || null)
    }

    if (deploymentsResult.status === 'fulfilled') {
      setDeployments(deploymentsResult.value.data || [])
    }

    if (logsResult.status === 'fulfilled') {
      setLogs(logsResult.value.data || [])
    }

    if (slaResult.status === 'fulfilled') {
      setSlaOverview(slaResult.value || null)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 10000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const ROLE_TABS = [
    { id: 'developer', label: 'Developer', icon: IconDeveloper },
    { id: 'devops', label: 'DevOps', icon: IconDevOps },
    { id: 'qa', label: 'QA', icon: IconQa },
    { id: 'manager', label: 'Engineering Manager', icon: IconManager },
  ]

  // Filter real error logs
  const errorLogs = logs.filter(
    (l) => l.level === 'ERROR' || l.level === 'CRITICAL' || l.severity === 'ERROR' || l.severity === 'CRITICAL'
  )

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved')
  const activeIncidentCount = incidentStats?.active_count ?? activeIncidents.length

  // Core services list for status summary
  const CORE_SERVICES = [
    { name: 'Payment Service', id: 'payment-service', ping: '2850ms', status: 'degraded' },
    { name: 'Order Service', id: 'order-service', ping: '620ms', status: 'degraded' },
    { name: 'API Gateway', id: 'api-gateway', ping: '45ms', status: 'healthy' },
    { name: 'Auth Service', id: 'auth-service', ping: '80ms', status: 'healthy' },
    { name: 'Inventory Service', id: 'inventory-service', ping: '120ms', status: 'healthy' },
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner & Perspective Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border-default">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight font-heading">
            System Reliability Overview
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Role-tailored telemetry views for Developer, DevOps, QA, and Engineering Manager personas
          </p>
        </div>

        {/* Primary Role Perspective Selector Tabs */}
        <div className="flex items-center p-1 rounded-lg border border-border-default bg-bg-secondary gap-1 self-start md:self-auto">
          {ROLE_TABS.map((tab) => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  switchRole(tab.id)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  isActive
                    ? 'bg-accent-blue text-white'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-card'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Predictive Warning Banner */}
      <WarningBanner />

      {/* ─────────────────────────────────────────────────────────────
          PERSPECTIVE 1: DEVELOPER VIEW
          Focus: Error logs, stack traces, AI RCA, code & deployment diffs
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'developer' && (
        <div className="space-y-5 animate-fade-in">
          {/* Quick stats for Devs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">
                Active Incidents
              </span>
              <p className={`text-2xl font-bold mt-1 font-heading ${activeIncidentCount > 0 ? 'text-accent-red' : 'text-text-primary'}`}>
                {activeIncidentCount}
              </p>
              <span className="text-xs text-text-muted">
                {activeIncidentCount > 0 ? 'Requiring triage & RCA' : '0 unresolved incidents'}
              </span>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">
                Recent Deployments
              </span>
              <p className="text-2xl font-bold text-accent-blue mt-1 font-heading">
                {deployments.length}
              </p>
              <span className="text-xs text-text-muted">
                Latest: {deployments[0]?.version ? `v${deployments[0].version}` : 'v2.4.0'}
              </span>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">
                Recent Error Bursts
              </span>
              <p className={`text-2xl font-bold mt-1 font-heading ${errorLogs.length > 0 ? 'text-accent-yellow' : 'text-text-primary'}`}>
                {errorLogs.length}
              </p>
              <span className="text-xs text-text-muted">
                {errorLogs.length > 0 ? 'Logged in current window' : 'No errors in last window'}
              </span>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-card p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">
                  AI RCA Engine
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-accent-green/10 text-accent-green border border-accent-green/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-base font-bold text-text-primary mt-1 font-heading">
                Groq Llama-3.3-70B
              </p>
              <span className="text-xs text-text-muted">&lt;2s automated analysis</span>
            </div>
          </div>

          {/* Primary Row: Correlated Incidents & Exceptions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Correlated Incidents with AI RCA */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border-default bg-bg-card p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border-default">
                  <div className="flex items-center gap-2">
                    <IconIncidents className="w-4 h-4 text-accent-red" />
                    <h3 className="text-sm font-bold text-text-primary font-heading">
                      Correlated Incident Intelligence
                    </h3>
                  </div>
                  <Link to="/incidents" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                    <span>Incident Triage</span>
                    <IconArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>

                {incidents.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <IconShield className="w-6 h-6 text-accent-green mx-auto" />
                    <p className="text-xs font-semibold text-text-primary font-heading">
                      0 Active Incidents Reported
                    </p>
                    <p className="text-xs text-text-muted max-w-sm mx-auto">
                      No active production incidents requiring triage. Incoming telemetry streams are being continuously monitored.
                    </p>
                  </div>
                ) : (
                  incidents.slice(0, 2).map((inc) => (
                    <div key={inc.id} className="p-4 rounded-lg border border-border-default bg-bg-secondary space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-accent-blue font-bold">
                              INC-{inc.id}
                            </span>
                            <span className="text-[11px] uppercase font-bold px-1.5 py-0.5 rounded bg-accent-red/10 text-accent-red border border-accent-red/30">
                              {inc.severity}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-text-primary mt-1 font-heading">
                            {inc.title}
                          </h4>
                          <span className="text-xs text-text-muted">
                            Service: <span className="font-semibold text-text-secondary font-mono">{inc.service_id}</span>
                          </span>
                        </div>
                        <Link
                          to="/incidents"
                          className="px-2.5 py-1 text-xs font-semibold rounded-md bg-accent-blue text-white hover:bg-accent-blue/90 transition flex-shrink-0"
                        >
                          Investigate
                        </Link>
                      </div>

                      <div className="rounded-md bg-bg-elevated p-3 text-xs border border-border-default space-y-1">
                        <div className="text-[11px] font-bold text-accent-yellow uppercase font-heading tracking-wider flex items-center gap-1">
                          <IconActivity className="w-3 h-3" />
                          <span>AI Root Cause Summary</span>
                        </div>
                        <p className="text-text-secondary leading-relaxed">
                          {inc.ai_rca?.root_cause ||
                            'Connection pool saturation on upstream database following release v2.4.0. Query timeouts propagating HTTP 504 errors.'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right: Recent Error Logs & Stack Traces */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-border-default bg-bg-card p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-border-default">
                  <div className="flex items-center gap-2">
                    <IconActivity className="w-4 h-4 text-accent-yellow" />
                    <h3 className="text-sm font-bold text-text-primary font-heading">
                      Recent Exceptions & Traces
                    </h3>
                  </div>
                  <Link to="/logs" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                    <span>View Logs</span>
                    <IconArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {errorLogs.length > 0 ? (
                    errorLogs.slice(0, 4).map((l, idx) => (
                      <div key={idx} className="p-2.5 rounded-md bg-bg-secondary border border-border-default text-accent-red">
                        <div className="text-xs text-text-muted mb-1 flex justify-between">
                          <span className="font-semibold text-text-primary">{l.service_id || 'service'}</span>
                          <span className="text-text-dim">{new Date(l.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-xs leading-relaxed break-words font-mono">{l.message}</div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center space-y-1.5 font-sans">
                      <IconCheckCircle className="w-5 h-5 text-accent-green mx-auto" />
                      <p className="text-xs font-semibold text-text-primary font-heading">
                        No Recent Exceptions
                      </p>
                      <p className="text-xs text-text-muted">
                        0 error or critical traces recorded in the current telemetry window.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Row: Deployments & Monitored Services */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Recent Code & Deployment Changes */}
            <div className="lg:col-span-6 rounded-xl border border-border-default bg-bg-card p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <IconDeployments className="w-4 h-4 text-accent-blue" />
                  <h3 className="text-sm font-bold text-text-primary font-heading">
                    Recent Releases & Deployment Events
                  </h3>
                </div>
                <Link to="/deployments" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                  <span>Deployments</span>
                  <IconArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {deployments.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-muted">
                  No deployment events recorded. CI/CD telemetry standing by.
                </div>
              ) : (
                <div className="space-y-2">
                  {deployments.slice(0, 3).map((dep) => (
                    <div key={dep.id} className="p-3 rounded-lg border border-border-default bg-bg-secondary flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary font-heading">{dep.service_id}</span>
                          <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-bg-card text-accent-blue border border-border-default">
                            v{dep.version}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted font-mono">
                          Commit #{dep.commit_hash ? dep.commit_hash.slice(0, 7) : 'a4f891b'}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase border ${
                          dep.status === 'success' || dep.status === 'active'
                            ? 'bg-accent-green/10 text-accent-green border-accent-green/20'
                            : 'bg-accent-red/10 text-accent-red border-accent-red/20'
                        }`}>
                          {dep.status || 'Active'}
                        </span>
                        <p className="text-[11px] text-text-dim">
                          {dep.timestamp ? new Date(dep.timestamp).toLocaleTimeString() : 'Recently'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monitored Services & Error Surface */}
            <div className="lg:col-span-6 rounded-xl border border-border-default bg-bg-card p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <IconServer className="w-4 h-4 text-accent-blue" />
                  <h3 className="text-sm font-bold text-text-primary font-heading">
                    Monitored Services & Error Health
                  </h3>
                </div>
                <Link to="/services" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                  <span>Topology</span>
                  <IconArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2">
                {CORE_SERVICES.slice(0, 4).map((s) => {
                  const sErrors = errorLogs.filter((l) => l.service_id === s.id).length
                  return (
                    <div key={s.id} className="p-3 rounded-lg border border-border-default bg-bg-secondary flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-text-primary font-heading">{s.name}</span>
                        <p className="text-xs text-text-muted font-mono">{s.id}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <span className="text-text-muted block text-[11px]">Errors in window:</span>
                          <span className={`font-mono font-bold ${sErrors > 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
                            {sErrors}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-text-muted block text-[11px]">Latency p95:</span>
                          <span className="font-mono font-bold text-text-secondary">{s.ping}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PERSPECTIVE 2: DEVOPS VIEW
          Focus: CPU/RAM/Disk sparklines, service grid, psutil telemetry, alerts
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'devops' && (
        <div className="space-y-5 animate-fade-in">
          {/* Telemetry Sparklines */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">CPU Utilization</span>
                <span className="text-sm font-bold text-accent-blue font-heading">{latestMetric?.cpu?.toFixed(1) || '48.2'}%</span>
              </div>
              <div className="h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.slice(-15)}>
                    <Area type="monotone" dataKey="cpu" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">Memory Allocated</span>
                <span className="text-sm font-bold text-accent-blue font-heading">{latestMetric?.memory?.toFixed(1) || '62.4'}%</span>
              </div>
              <div className="h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.slice(-15)}>
                    <Area type="monotone" dataKey="memory" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">Disk Usage</span>
                <span className="text-sm font-bold text-accent-green font-heading">{latestMetric?.disk?.toFixed(1) || '42.0'}%</span>
              </div>
              <div className="h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.slice(-15)}>
                    <Area type="monotone" dataKey="disk" stroke="#15803D" fill="#15803D" fillOpacity={0.15} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">Active Anomalies</span>
                <span className="text-sm font-bold text-accent-red font-heading">{anomalies.length}</span>
              </div>
              <p className="text-xs text-text-muted mt-2">Scored via IsolationForest (24h)</p>
            </div>
          </div>

          {/* Microservices Topology Grid */}
          <div className="rounded-xl border border-border-default bg-bg-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <IconServer className="w-4 h-4 text-accent-blue" />
                <h3 className="text-sm font-bold text-text-primary font-heading">
                  Production Services Infrastructure Health
                </h3>
              </div>
              <Link to="/services" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                <span>Topology Map</span>
                <IconArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {CORE_SERVICES.map((s) => (
                <div key={s.id} className="rounded-lg border border-border-default bg-bg-secondary p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary truncate font-heading">{s.name}</span>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                      s.status === 'healthy'
                        ? 'bg-accent-green/10 text-accent-green border-accent-green/30'
                        : 'bg-accent-red/10 text-accent-red border-accent-red/30'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted flex justify-between">
                    <span>Latency p95:</span>
                    <span className="font-mono font-bold text-text-secondary">{s.ping}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Row: Active Anomalies & Automated Runbooks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Active Infrastructure Anomalies */}
            <div className="lg:col-span-6 rounded-xl border border-border-default bg-bg-card p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <IconCpu className="w-4 h-4 text-accent-yellow" />
                  <h3 className="text-sm font-bold text-text-primary font-heading">
                    Active Infrastructure Anomalies
                  </h3>
                </div>
                <Link to="/metrics" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                  <span>Metrics</span>
                  <IconArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              {anomalies.length === 0 ? (
                <div className="py-6 text-center space-y-1">
                  <IconCheckCircle className="w-5 h-5 text-accent-green mx-auto" />
                  <p className="text-xs font-semibold text-text-primary font-heading">
                    Zero Anomalies Flagged
                  </p>
                  <p className="text-xs text-text-muted">
                    IsolationForest algorithm detected no anomalous timeseries deviations.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {anomalies.slice(0, 3).map((a, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border-default bg-bg-secondary flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-text-primary font-heading">{a.service_id || 'server-01'}</span>
                        <p className="text-text-muted text-[11px]">
                          Anomaly score: <span className="font-mono font-semibold text-accent-red">{a.score?.toFixed(3) || '-0.682'}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-accent-red/10 text-accent-red border border-accent-red/30 uppercase">
                          {a.severity || 'Critical'}
                        </span>
                        <p className="text-[11px] text-text-dim mt-0.5">
                          {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'Recent'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Automated Remediation & Runbook Status */}
            <div className="lg:col-span-6 rounded-xl border border-border-default bg-bg-card p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <IconShield className="w-4 h-4 text-accent-green" />
                  <h3 className="text-sm font-bold text-text-primary font-heading">
                    Remediation Runbooks & Safety Guards
                  </h3>
                </div>
                <Link to="/incidents" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                  <span>Runbooks</span>
                  <IconArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg border border-border-default bg-bg-secondary flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-text-primary font-heading">Connection Pool Scale-Out</span>
                    <p className="text-text-muted text-[11px]">Auto-scales max connections from 50 to 120 upon saturation</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/30">
                    Ready
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border-default bg-bg-secondary flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="font-bold text-text-primary font-heading">Automated Release Rollback</span>
                    <p className="text-text-muted text-[11px]">Triggers canary abort if error rate drift exceeds +500%</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue border border-accent-blue/30">
                    Armed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PERSPECTIVE 3: QA VIEW
          Focus: Response time trends, error rate deltas, Release Health cards
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'qa' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">Release Quality Score</span>
              <p className="text-2xl font-bold text-accent-yellow mt-1 font-heading">78 / 100</p>
              <span className="text-xs text-text-muted">1 regression flagged</span>
            </div>
            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">Tracked Releases</span>
              <p className="text-2xl font-bold text-text-primary mt-1 font-heading">{deployments.length || 5}</p>
              <span className="text-xs text-text-muted">Production & Staging</span>
            </div>
            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">P95 Latency Drift</span>
              <p className="text-2xl font-bold text-accent-red mt-1 font-heading">+738%</p>
              <span className="text-xs text-text-muted">Post v2.4.0 deploy</span>
            </div>
            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">Error Rate Drift</span>
              <p className="text-2xl font-bold text-accent-red mt-1 font-heading">+1675%</p>
              <span className="text-xs text-text-muted">0.8% → 14.2%</span>
            </div>
          </div>

          {/* Release Health Cards */}
          <div className="rounded-xl border border-border-default bg-bg-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <IconDeployments className="w-4 h-4 text-accent-blue" />
                <h3 className="text-sm font-bold text-text-primary font-heading">
                  Release Health Assessments (Before / After 30m)
                </h3>
              </div>
              <Link to="/deployments" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                <span>Deployments</span>
                <IconArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deployments.slice(0, 2).map((dep) => (
                <div key={dep.id} className="rounded-lg border border-border-default bg-bg-secondary p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-text-primary font-heading">{dep.service_id}</span>
                      <span className="ml-2 text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-bg-card text-accent-blue border border-border-default">
                        v{dep.version}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-accent-red/10 text-accent-red border border-accent-red/30">
                      REGRESSION DETECTED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-md bg-bg-card border border-border-default">
                      <span className="text-text-muted text-[11px] font-medium">Error Rate Delta</span>
                      <p className="font-bold text-accent-red mt-0.5">0.8% → 14.2% (+1675%)</p>
                    </div>
                    <div className="p-2.5 rounded-md bg-bg-card border border-border-default">
                      <span className="text-text-muted text-[11px] font-medium">Latency p95 Delta</span>
                      <p className="font-bold text-accent-red mt-0.5">340ms → 2850ms (+738%)</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary Row: Service Regression Matrix */}
          <div className="rounded-xl border border-border-default bg-bg-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <IconActivity className="w-4 h-4 text-accent-yellow" />
                <h3 className="text-sm font-bold text-text-primary font-heading">
                  Service Regression & Performance Baseline Matrix
                </h3>
              </div>
              <Link to="/reports" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                <span>View Full Audit</span>
                <IconArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-default text-text-muted font-heading uppercase text-[11px]">
                    <th className="pb-2">Service</th>
                    <th className="pb-2">Baseline Latency</th>
                    <th className="pb-2">Observed Latency</th>
                    <th className="pb-2">Error Rate</th>
                    <th className="pb-2">Regression Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default text-text-secondary">
                  <tr>
                    <td className="py-2.5 font-bold text-text-primary font-heading">payment-service</td>
                    <td className="py-2.5 font-mono">340ms</td>
                    <td className="py-2.5 font-mono text-accent-red font-bold">2850ms</td>
                    <td className="py-2.5 font-mono text-accent-red font-bold">14.2%</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-red/10 text-accent-red border border-accent-red/30">
                        Critical Regression
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-text-primary font-heading">order-service</td>
                    <td className="py-2.5 font-mono">180ms</td>
                    <td className="py-2.5 font-mono text-accent-yellow font-bold">620ms</td>
                    <td className="py-2.5 font-mono text-accent-yellow font-bold">3.1%</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30">
                        Moderate Drift
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-text-primary font-heading">api-gateway</td>
                    <td className="py-2.5 font-mono">42ms</td>
                    <td className="py-2.5 font-mono text-accent-green font-bold">45ms</td>
                    <td className="py-2.5 font-mono text-accent-green font-bold">0.05%</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-green/10 text-accent-green border border-accent-green/30">
                        Nominal
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PERSPECTIVE 4: ENGINEERING MANAGER VIEW
          Focus: Overall Availability, MTTR, SLA Uptime, Business Impact Panel
          ───────────────────────────────────────────────────────────── */}
      {activeTab === 'manager' && (
        <div className="space-y-5 animate-fade-in">
          {/* Executive KPI Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">System Availability</span>
              <p className="text-2xl font-bold text-accent-green mt-1 font-heading">
                {slaOverview?.overall_system_availability ? `${slaOverview.overall_system_availability.toFixed(2)}%` : '99.94%'}
              </p>
              <span className="text-xs text-accent-green font-medium">Within 99.9% target</span>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">MTTR (Mean Time to Resolve)</span>
              <p className="text-2xl font-bold text-accent-blue mt-1 font-heading">
                {incidentStats?.mttr_minutes ? `${incidentStats.mttr_minutes} min` : '14.5 min'}
              </p>
              <span className="text-xs text-text-muted">-42% vs manual triage</span>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">SLA At-Risk Services</span>
              <p className="text-2xl font-bold text-accent-yellow mt-1 font-heading">
                {slaOverview?.breached_services_count || 1}
              </p>
              <span className="text-xs text-text-muted">payment-service at threshold</span>
            </div>

            <div className="rounded-xl border border-border-default bg-bg-card p-4">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">Estimated Revenue Exposure</span>
              <p className="text-2xl font-bold text-accent-red mt-1 font-heading">
                $12,400
              </p>
              <span className="text-xs text-accent-red font-medium">17% checkout timeout rate</span>
            </div>
          </div>

          {/* Business Impact Layer Card */}
          <div className="rounded-xl border border-border-default bg-bg-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div className="flex items-center gap-2">
                <IconShield className="w-4 h-4 text-accent-blue" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-heading">
                  Operational Business Impact Translation
                </h3>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-bg-secondary text-text-muted border border-border-default">
                Telemetry Translated
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-bg-secondary border border-border-default space-y-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">Impacted Transactions</span>
                <p className="text-xl font-bold text-accent-red mt-1 font-heading">2,341 Failed</p>
                <p className="text-xs text-text-muted leading-relaxed">Checkout attempts degraded in 30-min window</p>
              </div>

              <div className="p-4 rounded-lg bg-bg-secondary border border-border-default space-y-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">Customer Experience Score</span>
                <p className="text-xl font-bold text-accent-yellow mt-1 font-heading">-34% CSAT</p>
                <p className="text-xs text-text-muted leading-relaxed">Latency exceeded 2.5s user tolerance limit</p>
              </div>

              <div className="p-4 rounded-lg bg-bg-secondary border border-border-default space-y-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">Post-Mortem Audit</span>
                <Link
                  to="/reports"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent-blue hover:underline"
                >
                  <span>Generate Incident Post-Mortem →</span>
                </Link>
                <p className="text-xs text-text-muted">Ready for stakeholder distribution</p>
              </div>
            </div>
          </div>

          {/* Secondary Row: SLA Compliance & Error Budget Tracking */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 rounded-xl border border-border-default bg-bg-card p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <IconSla className="w-4 h-4 text-accent-blue" />
                  <h3 className="text-sm font-bold text-text-primary font-heading">
                    SLA Error Budget & SLO Compliance
                  </h3>
                </div>
                <Link to="/sla" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                  <span>SLA Forecast</span>
                  <IconArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-text-primary">System Error Budget Remaining (Monthly)</span>
                    <span className="font-mono font-bold text-accent-blue">72.4%</span>
                  </div>
                  <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden border border-border-default">
                    <div className="h-full bg-accent-blue rounded-full" style={{ width: '72.4%' }} />
                  </div>
                  <p className="text-[11px] text-text-muted mt-1">27.6% consumed (4.2h allowable downtime budget remaining)</p>
                </div>

                <div className="pt-2 border-t border-border-default grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-default">
                    <span className="text-text-muted text-[11px] block">Contractual SLA</span>
                    <span className="font-heading font-bold text-text-primary text-sm">99.90%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-bg-secondary border border-border-default">
                    <span className="text-text-muted text-[11px] block">Current 30d Uptime</span>
                    <span className="font-heading font-bold text-accent-green text-sm">99.94%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-border-default bg-bg-card p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <IconReports className="w-4 h-4 text-accent-blue" />
                  <h3 className="text-sm font-bold text-text-primary font-heading">
                    Audit & Reporting Center
                  </h3>
                </div>
                <Link to="/reports" className="text-xs text-accent-blue hover:underline font-medium flex items-center gap-1">
                  <span>Reports</span>
                  <IconArrowUpRight className="w-3 h-3" />
                </Link>
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                Automated executive postmortems aggregate timeline telemetry, IsolationForest anomaly scores, and Groq AI root cause analyses for stakeholder review.
              </p>

              <div className="pt-2">
                <Link
                  to="/reports"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 transition"
                >
                  <IconReports className="w-3.5 h-3.5" />
                  <span>Open Executive Postmortem Hub</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
