/**
 * DEVSIGHTAI — Enterprise Authentication: Sign In Page
 *
 * Implements:
 * - Direct Supabase Auth signInWithPassword
 * - Password visibility toggle
 * - Strict client-side validation & error handling
 * - Clean loading spinner and disabled submit state
 * - Quick Demo Autofill presets for testing and presentation
 * - Forgot Password reset modal
 * - Dual-theme support (Dark / Light) matching DEVSIGHTAI design system
 */

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

// Icons
function IconMail({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function IconLock({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )
}

function IconEye({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function IconEyeOff({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
    </svg>
  )
}

function IconShield({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function IconSun({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function IconMoon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  )
}

export default function LoginPage() {
  const { signIn, signInDemo, resetPassword, isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect target if redirected from a protected route
  const from = location.state?.from?.pathname || '/'

  // Redirect if already authenticated
  if (isAuthenticated) {
    navigate(from, { replace: true })
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Password Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetFeedback, setResetFeedback] = useState({ error: '', success: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    // Basic Validation
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }
    if (!password) {
      setErrorMsg('Please enter your password.')
      return
    }

    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      const message = err?.message || 'Authentication failed. Please verify your credentials.'
      setErrorMsg(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetFeedback({ error: '', success: '' })
    if (!resetEmail.trim() || !resetEmail.includes('@')) {
      setResetFeedback({ error: 'Please enter a valid email.', success: '' })
      return
    }

    setResetSubmitting(true)
    try {
      await resetPassword(resetEmail)
      setResetFeedback({
        error: '',
        success: 'Password reset link sent! Check your inbox for instructions.',
      })
    } catch (err) {
      setResetFeedback({
        error: err?.message || 'Failed to send password reset email.',
        success: '',
      })
    } finally {
      setResetSubmitting(false)
    }
  }

  // Quick Demo Access Handler
  const handleQuickDemo = (role) => {
    signInDemo(role)
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-bg-primary text-text-primary">
      {/* Top Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border-default bg-bg-secondary/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse" />
          <span className="font-heading font-bold text-sm tracking-wider text-text-primary">
            DEVSIGHTAI
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-bg-elevated border border-border-default text-accent-blue font-semibold">
            Enterprise Security
          </span>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-border-default bg-bg-card hover:bg-bg-elevated text-text-secondary hover:text-text-primary transition"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <IconSun className="w-4 h-4 text-accent-yellow" />
          ) : (
            <IconMoon className="w-4 h-4 text-accent-blue" />
          )}
        </button>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-md">
          {/* Card Shell */}
          <div className="rounded-2xl border border-border-default bg-bg-card shadow-2xl p-6 sm:p-8 transition-all">
            {/* Header / Brand */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-green/10 border border-accent-green/30 text-accent-green mb-4 shadow-sm">
                <IconShield className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold font-heading text-text-primary tracking-tight">
                Sign in to DEVSIGHTAI
              </h1>
              <p className="text-xs text-text-muted mt-2">
                Application Reliability & Incident Intelligence Platform
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-xl border border-accent-red/30 bg-accent-red/10 text-accent-red text-xs flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-red flex-shrink-0 mt-1.5" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Success Message Alert */}
            {successMsg && (
              <div className="mb-6 p-3.5 rounded-xl border border-accent-green/30 bg-accent-green/10 text-accent-green text-xs flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-green flex-shrink-0 mt-1.5" />
                <span className="leading-relaxed font-medium">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider font-heading">
                  Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-dim">
                    <IconMail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@company.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-dim text-xs focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider font-heading">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email)
                      setShowResetModal(true)
                    }}
                    className="text-[11px] text-accent-blue hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-dim">
                    <IconLock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-dim text-xs focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-dim hover:text-text-primary transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-accent-green hover:bg-accent-green/90 focus:outline-none focus:ring-2 focus:ring-accent-green/40 shadow-lg shadow-accent-green/20 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Quick Demo Fill Options */}
            <div className="mt-6 pt-6 border-t border-border-default">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-dim font-heading">
                  Quick Demo Evaluation Roles
                </span>
                <span className="text-[10px] font-mono text-accent-green">1-Click</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: 'developer', label: 'Developer', color: 'hover:border-accent-green hover:text-accent-green' },
                  { role: 'devops', label: 'DevOps', color: 'hover:border-accent-blue hover:text-accent-blue' },
                  { role: 'qa', label: 'QA Lead', color: 'hover:border-accent-purple hover:text-accent-purple' },
                  { role: 'manager', label: 'Eng Manager', color: 'hover:border-accent-yellow hover:text-accent-yellow' },
                ].map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleQuickDemo(demo.role)}
                    className={`py-1.5 px-2.5 rounded-lg border border-border-default bg-bg-secondary text-[11px] font-semibold text-text-secondary transition text-left ${demo.color}`}
                  >
                    🚀 {demo.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sign Up Redirect */}
            <p className="mt-6 text-center text-xs text-text-muted">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-accent-blue hover:underline"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border-default bg-bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <h3 className="text-sm font-bold font-heading text-text-primary">
                Reset Account Password
              </h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Enter your work email address and Supabase will dispatch a secure recovery link.
            </p>

            {resetFeedback.error && (
              <div className="p-2.5 rounded-lg border border-accent-red/30 bg-accent-red/10 text-accent-red text-xs">
                {resetFeedback.error}
              </div>
            )}

            {resetFeedback.success && (
              <div className="p-2.5 rounded-lg border border-accent-green/30 bg-accent-green/10 text-accent-green text-xs">
                {resetFeedback.success}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="operator@company.com"
                className="w-full px-3 py-2 rounded-xl border border-border-default bg-bg-secondary text-text-primary text-xs focus:outline-none focus:border-accent-blue transition"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-border-default text-xs text-text-secondary hover:bg-bg-elevated transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-semibold hover:bg-accent-blue/90 disabled:opacity-60 transition"
                >
                  {resetSubmitting ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-border-default bg-bg-secondary/40 text-center text-xs text-text-muted">
        <div className="flex items-center justify-center gap-4">
          <Link to="/privacy" className="hover:text-text-primary">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link to="/terms" className="hover:text-text-primary">
            Terms of Service
          </Link>
          <span>•</span>
          <span className="font-mono text-text-dim">DEVSIGHTAI v1.0</span>
        </div>
      </footer>
    </div>
  )
}
