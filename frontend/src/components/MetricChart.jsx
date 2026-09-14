/**
 * DEVSIGHTAI — MetricChart Component
 *
 * Reusable Recharts AreaChart for time-series metric visualization.
 * Supports anomaly dot overlay — anomalous data points render as
 * red pulsing circles on the chart.
 *
 * Theme-aware grid lines, axes, tooltips, and release deployment markers.
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { IconDeployments } from './icons'

/**
 * Custom dot renderer — red pulsing dot for anomalous points,
 * no dot for normal points.
 */
function AnomalyDot({ cx, cy, payload, anomalyTimestamps }) {
  if (!anomalyTimestamps || !payload?.timestamp) return null

  const isAnomaly = anomalyTimestamps.has(payload.timestamp)
  if (!isAnomaly) return null

  return (
    <g>
      {/* Outer pulse */}
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill="rgba(239, 68, 68, 0.25)"
        className="animate-pulse"
      />
      {/* Inner dot */}
      <circle cx={cx} cy={cy} r={3.5} fill="#EF4444" stroke="#fff" strokeWidth={1.5} />
    </g>
  )
}

/**
 * Custom tooltip with theme-aware styling.
 */
function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null

  const value = payload[0]?.value
  const ts = label || payload[0]?.payload?.displayTime || ''

  return (
    <div className="rounded-md border border-border-default bg-bg-card px-3 py-2 shadow-lg text-xs">
      <p className="text-text-muted mb-1 font-mono text-[11px]">{ts}</p>
      <p className="text-text-primary font-bold">
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit && <span className="text-text-dim font-normal ml-1">{unit}</span>}
      </p>
    </div>
  )
}

/**
 * Format timestamp for X-axis tick labels.
 */
function formatTime(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}

export default function MetricChart({
  data = [],
  dataKey,
  color = '#3B82F6',
  anomalyTimestamps = new Set(),
  deployments = [],
  title = '',
  unit = '',
  height = 200,
}) {
  // Prepare data with display-friendly time labels
  const chartData = data.map((d) => ({
    ...d,
    displayTime: formatTime(d.timestamp),
  }))

  // Match deployment markers to chart display times
  const activeDeploymentMarkers = (deployments || [])
    .map((dep) => {
      const depTimeStr = dep.deployed_at || dep.timestamp
      if (!depTimeStr || chartData.length === 0) return null

      const depDate = new Date(depTimeStr).getTime()
      let closestPoint = null
      let minDiff = Infinity

      for (const pt of chartData) {
        if (!pt.timestamp) continue
        const ptDate = new Date(pt.timestamp).getTime()
        const diff = Math.abs(ptDate - depDate)
        if (diff < minDiff) {
          minDiff = diff
          closestPoint = pt
        }
      }

      if (closestPoint && minDiff <= 3600 * 1000) {
        return {
          id: dep.id || dep.version,
          version: dep.version,
          displayTime: closestPoint.displayTime,
          fullDate: depTimeStr,
        }
      }
      return null
    })
    .filter(Boolean)

  const currentValue = chartData.length > 0
    ? chartData[chartData.length - 1]?.[dataKey]
    : null

  const gradientId = `gradient-${dataKey}-${color.replace('#', '')}`

  return (
    <div className="rounded-xl border border-border-default bg-bg-card p-4 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-text-primary tracking-tight font-heading">
            {title}
          </h3>
          {activeDeploymentMarkers.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-accent-green/10 text-accent-green border border-accent-green/30 px-1.5 py-0.5 rounded">
              <IconDeployments className="w-2.5 h-2.5" />
              <span>{activeDeploymentMarkers.length} release{activeDeploymentMarkers.length > 1 ? 's' : ''}</span>
            </span>
          )}
        </div>
        {currentValue !== null && currentValue !== undefined && (
          <span
            className="text-base font-bold tabular-nums font-heading"
            style={{ color }}
          >
            {typeof currentValue === 'number' ? currentValue.toFixed(1) : currentValue}
            {unit && <span className="text-xs text-text-dim ml-0.5 font-normal">{unit}</span>}
          </span>
        )}
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div
          className="flex items-center justify-center text-text-dim text-xs"
          style={{ height }}
        >
          Awaiting telemetry data...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-default)"
              opacity={0.6}
              vertical={false}
            />
            <XAxis
              dataKey="displayTime"
              tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--border-default)' }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fill: 'var(--text-dim)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={unit === '%' ? [0, 100] : ['auto', 'auto']}
            />
            <Tooltip
              content={<ChartTooltip unit={unit} dataKey={dataKey} />}
              cursor={{ stroke: 'var(--border-default)', strokeDasharray: '3 3' }}
            />

            {/* Deployment Markers */}
            {activeDeploymentMarkers.map((marker, idx) => (
              <ReferenceLine
                key={`dep-ref-${idx}`}
                x={marker.displayTime}
                stroke="var(--color-accent-green)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{
                  value: `v${marker.version}`,
                  fill: 'var(--color-accent-green)',
                  fontSize: 10,
                  fontWeight: 600,
                  position: 'top',
                }}
              />
            ))}

            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={(props) => (
                <AnomalyDot {...props} anomalyTimestamps={anomalyTimestamps} />
              )}
              activeDot={{
                r: 4.5,
                stroke: color,
                strokeWidth: 2,
                fill: 'var(--bg-card)',
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Anomaly indicator */}
      {anomalyTimestamps.size > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-accent-red font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse" />
          <span>{anomalyTimestamps.size} anomal{anomalyTimestamps.size === 1 ? 'y' : 'ies'} detected</span>
        </div>
      )}
    </div>
  )
}
