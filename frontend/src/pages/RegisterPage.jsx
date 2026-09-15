/**
 * DEVSIGHTAI — Enterprise Authentication: Sign Up / Register Page
 *
 * Implements:
 * - Direct Supabase Auth signUp with metadata (full_name, role)
 * - Dynamic Role selector (developer, devops, qa, manager)
 * - Password confirmation & strength check
 * - Password visibility toggles
 * - Form validation with clear error feedback
 * - Automatic session handling / Email confirmation notice
 * - Dual-theme support matching DEVSIGHTAI design system
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

// Icons
function IconUser({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

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

function IconCheck({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

const ROLES = [
  { id: 'developer', title: 'Developer', desc: 'Code anomalies, traces & git commits' },
  { id: 'devops', title: 'DevOps / SRE', desc: 'Kubernetes, servers & deployment safety' },
  { id: 'qa', title: 'QA Engineer', desc: 'Synthetic health & automated regression analysis' },
  { id: 'manager', title: 'Engineering Manager', desc: 'SLA budgets, burn rates & executive reporting' },
]

export default function RegisterPage() {
  const { signUp, isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  if (isAuthenticated) {
    navigate('/', { replace: true })
  }

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState('developer')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successInfo, setSuccessInfo] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessInfo(null)

    // Form Validations
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid work email.')
      return
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters in length.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.')
      return
    }

    setSubmitting(true)
    try {
      const data = await signUp(email, password, {
        fullName,
        role: selectedRole,
      })

      // Check if session was created immediately or requires email confirmation
      if (data?.session) {
        navigate('/', { replace: true })
      } else {
        setSuccessInfo(
          `Account registered successfully for ${email}. If your Supabase configuration requires email verification, please verify via the confirmation link sent to your inbox before signing in.`
        )
      }
    } catch (err) {
      console.error('Registration error:', err)
      setErrorMsg(err?.message || 'Failed to create account. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-bg-primary text-text-primary">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border-default bg-bg-secondary/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse" />
          <span className="font-heading font-bold text-sm tracking-wider text-text-primary">
            DEVSIGHTAI
          </span>
          <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-bg-elevated border border-border-default text-accent-blue font-semibold">
            Account Registration
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

      {/* Main Registration Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-border-default bg-bg-card shadow-2xl p-6 sm:p-8 transition-all">
            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold font-heading text-text-primary tracking-tight">
                Create your Engineer Account
              </h1>
              <p className="text-xs text-text-muted mt-1.5">
                Join DEVSIGHTAI to monitor services, diagnose root causes, and protect SLAs.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl border border-accent-red/30 bg-accent-red/10 text-accent-red text-xs flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-red flex-shrink-0 mt-1.5" />
                <span className="leading-relaxed font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successInfo && (
              <div className="mb-5 p-4 rounded-xl border border-accent-green/30 bg-accent-green/10 text-text-primary text-xs space-y-3">
                <div className="flex items-center gap-2 text-accent-green font-bold">
                  <IconCheck className="w-4 h-4" />
                  <span>Registration Initiated!</span>
                </div>
                <p className="text-text-secondary leading-relaxed">{successInfo}</p>
                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent-green text-white text-xs font-semibold hover:bg-accent-green/90 transition shadow-sm"
                  >
                    Proceed to Sign In →
                  </Link>
                </div>
              </div>
            )}

            {!successInfo && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider font-heading">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-dim">
                      <IconUser className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Mercer"
                      autoComplete="name"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-dim text-xs focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition"
                    />
                  </div>
                </div>

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
                      placeholder="alex@company.com"
                      autoComplete="email"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-dim text-xs focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition"
                    />
                  </div>
                </div>

                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider font-heading">
                    Primary Operational Role
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ROLES.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRole(r.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between text-left ${
                          selectedRole === r.id
                            ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                            : 'border-border-default bg-bg-secondary hover:border-border-default/80 text-text-secondary'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-heading">{r.title}</span>
                          {selectedRole === r.id && <IconCheck className="w-3.5 h-3.5 text-accent-blue" />}
                        </div>
                        <span className="text-[10px] text-text-dim mt-1 leading-snug">{r.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Password and Confirm Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider font-heading">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-dim">
                        <IconLock className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 chars"
                        autoComplete="new-password"
                        className="w-full pl-8 pr-8 py-2 rounded-xl border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-dim text-xs focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-dim hover:text-text-primary transition"
                      >
                        {showPassword ? <IconEyeOff className="w-3.5 h-3.5" /> : <IconEye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wider font-heading">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-dim">
                        <IconLock className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        autoComplete="new-password"
                        className="w-full pl-8 pr-8 py-2 rounded-xl border border-border-default bg-bg-secondary text-text-primary placeholder:text-text-dim text-xs focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition"
                      />
                    </div>
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
                      <span>Creating Profile...</span>
                    </>
                  ) : (
                    <span>Register Account</span>
                  )}
                </button>
              </form>
            )}

            {/* Back to Sign In */}
            <p className="mt-6 text-center text-xs text-text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-accent-blue hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </main>

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
