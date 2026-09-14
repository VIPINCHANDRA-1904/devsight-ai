/**
 * DEVSIGHTAI — Logs Intelligence Page
 *
 * Log viewer with:
 * - Tabular display with severity-colored badges
 * - Filter controls: service, level, time window
 * - Auto-refresh every 15 seconds
 * - Error frequency bar visualization per 5-min window
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

const LEVEL_STYLES = {
  INFO: {
    bg: 'bg-accent-blue/15',
    text: 'text-accent-blue',
    border: 'border-accent-blue/30',
  },
  WARN: {
    bg: 'bg-accent-yellow/15',
    text: 'text-accent-yellow',
    border: 'border-accent-yellow/30',
  },
  ERROR: {
    bg: 'bg-accent-red/15',
    text: 'text-accent-red',
    border: 'border-accent-red/30',
  },
  CRITICAL: {
    bg: 'bg-accent-pink/15',
    text: 'text-accent-pink',
    border: 'border-accent-pink/30',
  },
}

const TIME_WINDOWS = [
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
]

const LOG_LEVELS = ['ALL', 'INFO', 'WARN', 'ERROR', 'CRITICAL']

const REFRESH_INTERVAL = 15000 // 15 seconds

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [serviceId, setServiceId] = useState('server-01')
  const [level, setLevel] = useState('ALL')
  const [timeWindow, setTimeWindow] = useState('1h')
  const [logCount, setLogCount] = useState(0)

  const fetchLogs = useCallback(async () => {
    try {
      const options = {
        window: timeWindow,
        limit: 200,
      }
      if (level !== 'ALL') {
        options.level = level
      }

      const result = await api.getLogs(serviceId, options)
      setLogs(result.data || [])
      setLogCount(result.count || 0)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [serviceId, level, timeWindow])

  useEffect(() => {
    setLoading(true)
    fetchLogs()
    const interval = setInterval(fetchLogs, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchLogs])

  // Compute error frequency buckets (5-min windows)
  const errorFrequency = computeErrorFrequency(logs)

  // Level distribution
  const levelCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      {/* Page header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-text-primary tracking-tight font-heading">
          Log Intelligence
        </h2>
        <p className="text-sm text-text-muted mt-0.5">
          Application log analysis with severity classification and pattern detection
        </p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Service input */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Service
          </label>
          <input
            type="text"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="rounded-md border border-border-default bg-bg-secondary px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent-blue transition-colors w-36"
          />
        </div>

        {/* Level filter */}
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Level
          </label>
          <div className="flex gap-0.5">
            {LOG_LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  level === l
                    ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                    : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Time window */}
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Window
          </label>
          <div className="flex gap-0.5">
            {TIME_WINDOWS.map((tw) => (
              <button
                key={tw.value}
                onClick={() => setTimeWindow(tw.value)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                  timeWindow === tw.value
                    ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                    : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                {tw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Log count */}
        <div className="ml-auto text-[11px] text-text-dim">
          {logCount} logs
        </div>
      </div>

      {/* Level distribution bar */}
      <div className="flex gap-3 mb-4">
        {['INFO', 'WARN', 'ERROR', 'CRITICAL'].map((lvl) => {
          const count = levelCounts[lvl] || 0
          const style = LEVEL_STYLES[lvl]
          return (
            <div
              key={lvl}
              className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2 flex-1 text-center`}
            >
              <p className={`text-lg font-bold tabular-nums font-heading ${style.text}`}>{count}</p>
              <p className="text-[10px] text-text-dim font-medium uppercase font-heading">{lvl}</p>
            </div>
          )
        })}
      </div>

      {/* Error frequency bars */}
      {errorFrequency.length > 0 && (
        <div className="rounded-xl border border-border-default bg-bg-card p-4 mb-4">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 font-heading">
            Error Frequency (5-min windows)
          </h3>
          <div className="flex items-end gap-1 h-16">
            {errorFrequency.map((bucket, i) => {
              const maxCount = Math.max(...errorFrequency.map((b) => b.count), 1)
              const heightPct = (bucket.count / maxCount) * 100
              return (
                <div
                  key={i}
                  className="flex-1 group relative"
                  title={`${bucket.label}: ${bucket.count} errors`}
                >
                  <div
                    className={`rounded-t transition-all ${
                      bucket.count > 10 ? 'bg-accent-red' : bucket.count > 5 ? 'bg-accent-yellow' : 'bg-accent-blue/40'
                    }`}
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                  />
                  <p className="text-[8px] text-text-dim text-center mt-0.5 truncate">
                    {bucket.label}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-accent-red/20 bg-accent-red/10 px-4 py-3 mb-4 text-sm text-accent-red">
          {error}
        </div>
      )}

      {/* Log table */}
      <div className="rounded-xl border border-border-default bg-bg-card overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-text-dim">Loading logs...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-2xl mb-2">{ '{ }' }</p>
              <p className="text-sm text-text-muted">No logs found</p>
              <p className="text-xs text-text-dim mt-1">
                Adjust filters or wait for log data to arrive
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider w-[140px]">
                    Timestamp
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider w-[80px]">
                    Level
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider w-[100px]">
                    Service
                  </th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => {
                  const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO
                  return (
                    <tr
                      key={log.id || index}
                      className="border-b border-border-subtle/50 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-2 text-xs text-text-dim font-mono tabular-nums whitespace-nowrap">
                        {formatLogTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${style.bg} ${style.text} border ${style.border}`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-text-muted">
                        {log.service_id}
                      </td>
                      <td className="px-4 py-2 text-xs text-text-primary font-mono leading-relaxed">
                        {log.message}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


/**
 * Group error logs into 5-minute buckets for the frequency bar chart.
 */
function computeErrorFrequency(logs) {
  const errorLogs = logs.filter((l) => l.level === 'ERROR' || l.level === 'CRITICAL')
  if (errorLogs.length === 0) return []

  const buckets = {}
  errorLogs.forEach((log) => {
    const d = new Date(log.timestamp)
    // Round down to nearest 5-minute mark
    d.setMinutes(Math.floor(d.getMinutes() / 5) * 5, 0, 0)
    const key = d.toISOString()
    buckets[key] = (buckets[key] || 0) + 1
  })

  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({
      label: new Date(key).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      count,
    }))
}


function formatLogTimestamp(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      + '.' + String(d.getMilliseconds()).padStart(3, '0')
  } catch {
    return iso
  }
}
