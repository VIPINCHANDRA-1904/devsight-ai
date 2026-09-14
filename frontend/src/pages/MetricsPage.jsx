/**
 * DEVSIGHTAI — Metrics Dashboard Page
 *
 * Full metrics visualization with:
 * - 4 Recharts AreaChart panels: CPU, Memory, Disk, Network I/O
 * - Polls /api/metrics/{service_id} every 10s to match agent interval
 * - Anomaly dot overlay from /api/anomalies/{service_id}
 * - Summary stat cards at the top
 * - WarningBanner for active predictive warnings
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import MetricChart from '../components/MetricChart'
import WarningBanner from '../components/WarningBanner'

const SERVICE_ID = 'server-01' // Default service for the psutil agent
const POLL_INTERVAL = 10000 // 10 seconds

const METRIC_CONFIGS = [
  { dataKey: 'cpu', title: 'CPU Usage', color: '#3B82F6', unit: '%' },
  { dataKey: 'memory', title: 'Memory Usage', color: '#8B5CF6', unit: '%' },
  { dataKey: 'disk', title: 'Disk Usage', color: '#10B981', unit: '%' },
  { dataKey: 'network_recv_mb', title: 'Network Received', color: '#06B6D4', unit: 'MB' },
]

export default function MetricsPage() {
  const [metrics, setMetrics] = useState([])
  const [anomalyTimestamps, setAnomalyTimestamps] = useState(new Set())
  const [deployments, setDeployments] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      // Fetch metrics, anomalies, and deployments in parallel (Phase 5)
      const [metricsResult, anomaliesResult, deploymentsResult] = await Promise.allSettled([
        api.getMetrics(SERVICE_ID, { limit: 100 }),
        api.getAnomalies(SERVICE_ID, { window: '6h' }),
        api.getDeployments({ limit: 10 }),
      ])

      if (metricsResult.status === 'fulfilled') {
        // Reverse to chronological order (API returns desc)
        const data = (metricsResult.value.data || []).reverse()
        setMetrics(data)
        setLastUpdated(new Date())
        setError(null)
      }

      if (anomaliesResult.status === 'fulfilled') {
        const anomalies = anomaliesResult.value.data || []
        // Extract anomaly timestamps for overlay
        const timestamps = new Set(
          anomalies.map((a) => a.metric_snapshot?.timestamp).filter(Boolean)
        )
        setAnomalyTimestamps(timestamps)
      }

      if (deploymentsResult.status === 'fulfilled') {
        setDeployments(deploymentsResult.value.data || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  // Compute summary stats from latest metric
  const latest = metrics.length > 0 ? metrics[metrics.length - 1] : null

  const summaryCards = [
    {
      label: 'CPU',
      value: latest ? `${latest.cpu?.toFixed(1)}%` : '--',
      color: latest?.cpu > 80 ? '#EF4444' : latest?.cpu > 60 ? '#F59E0B' : '#10B981',
    },
    {
      label: 'Memory',
      value: latest ? `${latest.memory?.toFixed(1)}%` : '--',
      color: latest?.memory > 80 ? '#EF4444' : latest?.memory > 60 ? '#F59E0B' : '#10B981',
    },
    {
      label: 'Disk',
      value: latest ? `${latest.disk?.toFixed(1)}%` : '--',
      color: latest?.disk > 85 ? '#EF4444' : latest?.disk > 70 ? '#F59E0B' : '#10B981',
    },
    {
      label: 'Anomalies',
      value: `${anomalyTimestamps.size}`,
      color: anomalyTimestamps.size > 0 ? '#EF4444' : '#10B981',
    },
  ]

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight font-heading">
            Metrics Dashboard
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            Real-time server metrics with anomaly detection overlay
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-text-dim">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-accent-green">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
            Live ({POLL_INTERVAL / 1000}s)
          </div>
        </div>
      </div>

      {/* Predictive warnings */}
      <WarningBanner />

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-accent-red/20 bg-accent-red/10 px-4 py-3 mb-4 text-sm text-accent-red">
          {error}
        </div>
      )}

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border-default bg-bg-card px-4 py-3"
          >
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1 font-heading">
              {card.label}
            </p>
            <p className="text-xl font-bold tabular-nums font-heading" style={{ color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Loading state */}
      {loading && metrics.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {METRIC_CONFIGS.map((cfg) => (
            <div
              key={cfg.dataKey}
              className="rounded-xl border border-border-default bg-bg-card p-4 h-[260px] flex items-center justify-center"
            >
              <div className="text-center">
                <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-text-dim">Loading {cfg.title}...</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Metric charts — 2x2 grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {METRIC_CONFIGS.map((cfg) => (
            <MetricChart
              key={cfg.dataKey}
              data={metrics}
              dataKey={cfg.dataKey}
              color={cfg.color}
              title={cfg.title}
              unit={cfg.unit}
              anomalyTimestamps={anomalyTimestamps}
              deployments={deployments}
              height={200}
            />
          ))}
        </div>
      )}

      {/* Data point counter */}
      <div className="mt-4 text-[11px] text-text-dim text-right">
        {metrics.length} data points loaded
        {anomalyTimestamps.size > 0 && (
          <span className="text-accent-red ml-2">
            | {anomalyTimestamps.size} anomal{anomalyTimestamps.size === 1 ? 'y' : 'ies'}
          </span>
        )}
      </div>
    </div>
  )
}
