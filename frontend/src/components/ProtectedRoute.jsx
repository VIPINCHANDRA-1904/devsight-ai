/**
 * DEVSIGHTAI — Protected Route Guard
 *
 * Ensures only authenticated users can access dashboard pages.
 * Displays a sleek telemetry verification loader during session restoration.
 * Redirects unauthenticated visitors to /login, preserving their target location.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-primary text-text-primary px-4">
        <div className="relative flex flex-col items-center max-w-sm w-full p-8 rounded-2xl border border-border-default bg-bg-card shadow-2xl">
          {/* Pulsing Radar Ring */}
          <div className="relative flex items-center justify-center w-16 h-16 mb-6">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent-green/20 animate-ping" />
            <span className="relative inline-flex rounded-full h-10 w-10 bg-accent-green/30 border border-accent-green items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-accent-green animate-pulse" />
            </span>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-base font-bold font-heading text-text-primary tracking-wide">
              VERIFYING CREDENTIALS
            </h3>
            <p className="text-xs text-text-muted font-sans leading-relaxed">
              Restoring secure session and synchronizing telemetry streams...
            </p>
          </div>

          {/* Telemetry progress bar simulation */}
          <div className="w-full mt-6 bg-bg-secondary rounded-full h-1.5 overflow-hidden border border-border-default/50">
            <div className="h-full bg-gradient-to-r from-accent-blue via-accent-green to-accent-blue w-full animate-pulse" />
          </div>

          <div className="mt-4 flex items-center justify-between w-full text-[10px] font-mono text-text-dim uppercase tracking-wider">
            <span>Auth Gate</span>
            <span className="text-accent-green">Active</span>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children ? children : <Outlet />
}
