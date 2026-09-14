/**
 * DEVSIGHTAI — WarningBanner Component
 *
 * Displays active predictive warnings from the trend analysis engine.
 * Shows dismissible banners with severity-appropriate coloring.
 * Zero emojis, clean SVG iconography, high contrast.
 */

import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { IconAlertTriangle, IconAlertOctagon, IconInfo, IconClose } from './icons'

const SEVERITY_CONFIG = {
  CRITICAL: {
    bg: 'bg-accent-red/10',
    border: 'border-accent-red/40',
    text: 'text-accent-red',
    icon: IconAlertOctagon,
    badge: 'bg-accent-red text-white',
  },
  HIGH: {
    bg: 'bg-accent-yellow/10',
    border: 'border-accent-yellow/40',
    text: 'text-accent-yellow',
    icon: IconAlertTriangle,
    badge: 'bg-accent-yellow text-white',
  },
  MEDIUM: {
    bg: 'bg-accent-yellow/10',
    border: 'border-accent-yellow/30',
    text: 'text-accent-yellow',
    icon: IconAlertTriangle,
    badge: 'bg-accent-yellow/20 text-accent-yellow border border-accent-yellow/30',
  },
  LOW: {
    bg: 'bg-accent-blue/10',
    border: 'border-accent-blue/30',
    text: 'text-accent-blue',
    icon: IconInfo,
    badge: 'bg-accent-blue/20 text-accent-blue',
  },
}

export default function WarningBanner() {
  const [warnings, setWarnings] = useState([])
  const [dismissed, setDismissed] = useState(new Set())

  const fetchWarnings = useCallback(async () => {
    try {
      const result = await api.getActiveWarnings()
      setWarnings(result.data || [])
    } catch {
      // Silently ignore if backend is down
    }
  }, [])

  useEffect(() => {
    fetchWarnings()
    const interval = setInterval(fetchWarnings, 30000)
    return () => clearInterval(interval)
  }, [fetchWarnings])

  const handleDismiss = (id) => {
    setDismissed((prev) => new Set([...prev, id]))
  }

  const activeWarnings = warnings.filter((w) => !dismissed.has(w.id))

  if (activeWarnings.length === 0) return null

  return (
    <div className="space-y-2">
      {activeWarnings.map((warning) => {
        const style = SEVERITY_CONFIG[warning.severity] || SEVERITY_CONFIG.MEDIUM
        const SeverityIcon = style.icon
        return (
          <div
            key={warning.id}
            className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${style.bg} ${style.border} text-xs transition`}
            role="alert"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <SeverityIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${style.text}`} />
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-heading ${style.badge}`}>
                    {warning.severity} PREDICTION
                  </span>
                  <span className="font-mono text-[11px] text-text-muted">
                    {warning.service_id}
                  </span>
                  {warning.predicted_breach_minutes && (
                    <span className="text-[11px] font-medium text-text-secondary">
                      • Estimated threshold breach: ~{warning.predicted_breach_minutes}m
                    </span>
                  )}
                </div>
                <p className="text-text-primary font-medium leading-relaxed">
                  {warning.message}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleDismiss(warning.id)}
              className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-bg-card transition flex-shrink-0"
              title="Dismiss warning"
              aria-label="Dismiss warning"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
