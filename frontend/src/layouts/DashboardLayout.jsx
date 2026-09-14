/**
 * DEVSIGHTAI — Dashboard Layout
 *
 * Enterprise observability shell featuring:
 * - Dual Light & Dark theme toggle
 * - Role-Adaptive Navigation & User Perspective Switcher
 * - Accessible SVG Iconography (Zero emojis)
 * - Realtime In-App Notification Drawer
 * - Embedded Defense & Legal navigation
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { api } from '../lib/api'
import ProfessorQAModal from '../components/ProfessorQAModal'
import {
  IconOverview,
  IconMetrics,
  IconLogs,
  IconIncidents,
  IconDeployments,
  IconServices,
  IconSla,
  IconReports,
  IconDemo,
  IconDefense,
  IconPrivacy,
  IconTerms,
  IconSun,
  IconMoon,
  IconBell,
  IconDeveloper,
  IconDevOps,
  IconQa,
  IconManager,
  IconChevronDown,
  IconCheck,
  IconActivity,
  IconShield,
} from '../components/icons'

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: IconOverview },
  { path: '/services', label: 'Services & Topology', icon: IconServices },
  { path: '/metrics', label: 'Metrics', icon: IconMetrics },
  { path: '/logs', label: 'Logs', icon: IconLogs },
  { path: '/incidents', label: 'Incidents', icon: IconIncidents },
  { path: '/deployments', label: 'Deployments', icon: IconDeployments },
  { path: '/sla', label: 'SLA & SLO', icon: IconSla },
  { path: '/reports', label: 'Reports', icon: IconReports },
  { path: '/demo', label: 'Demo Center', icon: IconDemo },
]

const ROLE_CONFIG = {
  developer: {
    label: 'Developer',
    badge: 'bg-accent-blue/10 text-accent-blue border-accent-blue/30',
    icon: IconDeveloper,
  },
  devops: {
    label: 'DevOps',
    badge: 'bg-accent-green/10 text-accent-green border-accent-green/30',
    icon: IconDevOps,
  },
  qa: {
    label: 'QA',
    badge: 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/30',
    icon: IconQa,
  },
  manager: {
    label: 'Engineering Manager',
    badge: 'bg-accent-blue/10 text-accent-blue border-accent-blue/30',
    icon: IconManager,
  },
}

export default function DashboardLayout() {
  const { user, role, switchRole } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // Notification state
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifMenu, setShowNotifMenu] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)
  const [showQAModal, setShowQAModal] = useState(false)
  const notifRef = useRef(null)
  const roleRef = useRef(null)

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await api.getNotifications({ limit: 15 })
      setNotifications(res.data || [])
      setUnreadCount(res.unread_count || 0)
    } catch (err) {
      console.debug('Failed to load notifications:', err)
    }
  }, [])

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 15000)
    return () => clearInterval(interval)
  }, [fetchNotifs])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifMenu(false)
      }
      if (roleRef.current && !roleRef.current.contains(e.target)) {
        setShowRoleMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkRead = async (id, e) => {
    e.stopPropagation()
    try {
      await api.markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error(err)
    }
  }

  const handleTestAlert = async () => {
    try {
      await api.triggerTestAlert()
      await fetchNotifs()
    } catch (err) {
      console.error(err)
    }
  }

  const currentRoleCfg = ROLE_CONFIG[role] || ROLE_CONFIG.developer
  const RoleIcon = currentRoleCfg.icon

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary text-text-primary">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 border-r border-border-default bg-bg-secondary flex flex-col justify-between">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="px-5 py-4 border-b border-border-default">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-green" />
              <span className="text-sm font-bold tracking-wider font-heading text-text-primary">
                DEVSIGHTAI
              </span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-bg-elevated text-accent-blue border border-border-default ml-auto font-semibold">
                v1.0
              </span>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Application Reliability Platform
            </p>
          </div>

          {/* Active Perspective Indicator (Sidebar) */}
          <div className="px-3 pt-3 pb-1">
            <div className="rounded-lg border border-border-default bg-bg-card p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-heading">
                  Active Perspective
                </span>
                <RoleIcon className="w-3.5 h-3.5 text-accent-blue" />
              </div>
              <p className="text-xs font-bold text-text-primary font-heading">
                {currentRoleCfg.label}
              </p>
              <p className="text-xs text-text-muted truncate mt-0.5">
                {user?.email || 'operator@devsight.ai'}
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const ItemIcon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-accent-blue/10 text-accent-blue font-semibold border-l-2 border-accent-blue'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated border-l-2 border-transparent'
                    }`
                  }
                >
                  <ItemIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer — Workspace Status & Governance */}
        <div className="p-3.5 border-t border-border-default bg-bg-secondary/40 space-y-2.5">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="text-text-muted font-medium">Session Role</span>
            <span className="font-semibold text-text-primary flex items-center gap-1.5 font-heading">
              <RoleIcon className="w-3.5 h-3.5 text-accent-blue" />
              {currentRoleCfg.label}
            </span>
          </div>

          {/* Legal / Policy Links */}
          <div className="flex items-center justify-between px-1 pt-2 border-t border-border-default text-xs text-text-muted">
            <Link to="/privacy" className="hover:text-text-primary flex items-center gap-1">
              <IconPrivacy className="w-3.5 h-3.5" />
              <span>Privacy</span>
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-text-primary flex items-center gap-1">
              <IconTerms className="w-3.5 h-3.5" />
              <span>Terms</span>
            </Link>
            <span>•</span>
            <span className="text-[11px] font-mono text-text-dim">v1.0-prod</span>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 border-b border-border-default bg-bg-primary/95 backdrop-blur-sm px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-text-primary font-heading tracking-wide uppercase">
              Reliability Platform
            </span>
            <span className="text-xs text-text-dim">/</span>
            <span className="text-xs font-medium text-text-secondary">
              {currentRoleCfg.label} Workspace
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Professor Defense Q&A Modal Trigger */}
            <button
              onClick={() => setShowQAModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border-default bg-bg-card hover:bg-bg-elevated hover:border-accent-blue text-xs font-semibold text-text-primary transition"
              title="Open Technical Defense & Q&A Guide"
            >
              <IconDefense className="w-3.5 h-3.5 text-accent-blue" />
              <span className="hidden sm:inline">Defense Guide</span>
            </button>

            {/* Live Telemetry Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-accent-green font-medium px-2 py-1 rounded bg-accent-green/10 border border-accent-green/20">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              <span className="hidden md:inline">Live Telemetry</span>
            </div>

            {/* Theme Toggle (Light / Dark) */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md border border-border-default bg-bg-card hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <IconSun className="w-4 h-4 text-accent-yellow" />
              ) : (
                <IconMoon className="w-4 h-4 text-accent-blue" />
              )}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-1.5 rounded-md border border-border-default bg-bg-card hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition"
                title="Notifications"
                aria-label="Notifications"
              >
                <IconBell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-accent-red text-white text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Drawer */}
              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border-default bg-bg-card p-3 shadow-xl z-50 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-border-default px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-text-primary font-heading">
                        Notifications
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-red text-white">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTestAlert}
                        className="text-[11px] text-accent-blue hover:underline font-medium"
                      >
                        + Test Alert
                      </button>
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-text-muted hover:text-text-primary"
                      >
                        Mark all read
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-text-muted text-center py-6">
                        No notifications recorded.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (n.incident_id) {
                              navigate('/incidents')
                              setShowNotifMenu(false)
                            }
                          }}
                          className={`p-2.5 rounded-lg border transition cursor-pointer text-left ${
                            n.read
                              ? 'border-border-default/60 bg-bg-secondary text-text-secondary'
                              : 'border-accent-blue/30 bg-bg-elevated text-text-primary'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-medium leading-snug">
                              {n.message}
                            </p>
                            {!n.read && (
                              <button
                                onClick={(e) => handleMarkRead(n.id, e)}
                                className="text-[10px] text-accent-blue hover:underline flex-shrink-0 font-semibold"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-1.5 text-[10px] text-text-dim">
                            <span className="uppercase font-mono font-semibold">{n.type}</span>
                            <span>{new Date(n.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Role Switcher Menu (Top Right) */}
            <div className="relative" ref={roleRef}>
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border-default bg-bg-card hover:bg-bg-elevated transition text-xs font-semibold"
              >
                <RoleIcon className="w-3.5 h-3.5 text-text-secondary" />
                <span className="text-text-primary">{currentRoleCfg.label}</span>
                <IconChevronDown className="w-3 h-3 text-text-dim ml-0.5" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border-default bg-bg-card p-1.5 shadow-xl z-50 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-text-muted uppercase font-heading">
                    Select Perspective
                  </div>
                  {Object.entries(ROLE_CONFIG).map(([rKey, rCfg]) => {
                    const RIcon = rCfg.icon
                    const isCurrent = role === rKey
                    return (
                      <button
                        key={rKey}
                        onClick={() => {
                          switchRole(rKey)
                          setShowRoleMenu(false)
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition text-left ${
                          isCurrent
                            ? 'bg-accent-blue/10 text-accent-blue font-bold'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RIcon className="w-3.5 h-3.5" />
                          <span>{rCfg.label}</span>
                        </div>
                        {isCurrent && <IconCheck className="w-3.5 h-3.5" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Professor Defense Q&A Modal */}
      <ProfessorQAModal
        isOpen={showQAModal}
        onClose={() => setShowQAModal(false)}
      />
    </div>
  )
}
