/**
 * DEVSIGHTAI — Authentication & RBAC Context
 *
 * Implements:
 * - Direct Supabase Auth integration (email/password, session persistence)
 * - Automatic session restoration & token refresh via onAuthStateChange
 * - Secure Bearer token attachment to centralized API client
 * - Role-Based Access Control (developer, devops, qa, manager, admin)
 * - Presentation quick-switch role persistence
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('developer')
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Helper to format user object from Supabase session
  const mapSupabaseUser = (sbUser, sessionToken, customRole = null) => {
    if (!sbUser) return null
    const meta = sbUser.user_metadata || {}
    const userRole = customRole || meta.role || 'developer'
    return {
      id: sbUser.id,
      email: sbUser.email,
      full_name: meta.full_name || sbUser.email?.split('@')[0] || 'Reliability Engineer',
      role: userRole,
      is_active: true,
      last_sign_in: sbUser.last_sign_in_at,
    }
  }

  // Sync token with API client and state
  const syncAuthState = useCallback((newSession, customRole = null) => {
    if (newSession?.user) {
      const accessToken = newSession.access_token
      const formattedUser = mapSupabaseUser(newSession.user, accessToken, customRole)
      setSession(newSession)
      setUser(formattedUser)
      setRole(formattedUser.role)
      setToken(accessToken)
      api.setAuthToken(accessToken)
    } else {
      setSession(null)
      setUser(null)
      setRole('developer')
      setToken(null)
      api.setAuthToken(null)
    }
  }, [])

  // Initialize and listen for Supabase auth state changes
  useEffect(() => {
    let mounted = true

    async function initAuth() {
      if (!supabase) {
        // Fallback for offline development if Supabase env vars are missing
        setLoading(false)
        return
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('[DEVSIGHTAI Auth] Session retrieval error:', error.message)
        }
        if (mounted) {
          syncAuthState(initialSession)
        }
      } catch (err) {
        console.error('[DEVSIGHTAI Auth] Unexpected init error:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen to Supabase auth events
    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          if (!mounted) return
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            syncAuthState(currentSession)
          } else if (event === 'SIGNED_OUT') {
            syncAuthState(null)
          }
          setLoading(false)
        }
      )

      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    }

    return () => {
      mounted = false
    }
  }, [syncAuthState])

  // Sign in with Email and Password
  const signIn = async (email, password) => {
    if (!supabase) {
      throw new Error('Supabase client is not configured. Check VITE_SUPABASE_URL.')
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        throw error
      }
      syncAuthState(data.session)
      return data.user
    } finally {
      setLoading(false)
    }
  }

  // Sign up with Email, Password, Full Name, and Role
  const signUp = async (email, password, { fullName, role: selectedRole = 'developer' } = {}) => {
    if (!supabase) {
      throw new Error('Supabase client is not configured. Check VITE_SUPABASE_URL.')
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName?.trim() || email.split('@')[0],
            role: selectedRole,
          },
        },
      })
      if (error) {
        throw error
      }

      // If Supabase has email confirmation disabled, session is returned immediately
      if (data.session) {
        syncAuthState(data.session)
      }

      return data
    } finally {
      setLoading(false)
    }
  }

  // Sign out of Supabase
  const signOut = async () => {
    setLoading(true)
    try {
      if (supabase) {
        await supabase.auth.signOut()
      }
      syncAuthState(null)
    } catch (err) {
      console.error('[DEVSIGHTAI Auth] Sign out error:', err)
      syncAuthState(null)
    } finally {
      setLoading(false)
    }
  }

  // Password Reset Email Trigger
  const resetPassword = async (email) => {
    if (!supabase) {
      throw new Error('Supabase client is not configured.')
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) {
      throw error
    }
    return true
  }

  // Switch Role for Live Presentation and Evaluation
  const switchRole = async (targetRole) => {
    setRole(targetRole)
    if (user) {
      setUser((prev) => (prev ? { ...prev, role: targetRole } : prev))
    }
    // Try to notify backend if demo switch route is available
    try {
      await api.demoSwitchRole(targetRole)
    } catch {
      // Non-blocking fallback
    }
  }

  // Demo user login convenience (for presentation evaluation when offline)
  const signInDemo = (demoRole = 'developer') => {
    const demoUser = {
      id: `u-${demoRole}-demo`,
      email: `${demoRole}@devsight.ai`,
      full_name: `${demoRole.charAt(0).toUpperCase() + demoRole.slice(1)} Demo User`,
      role: demoRole,
      is_active: true,
    }
    setUser(demoUser)
    setRole(demoRole)
    setToken('demo-mode-token')
    api.setAuthToken('demo-mode-token')
  }

  const value = {
    session,
    user,
    role,
    token,
    loading,
    isAuthenticated: Boolean(user || session),
    signIn,
    signUp,
    signOut,
    resetPassword,
    switchRole,
    signInDemo,
    // Aliases for legacy compatibility
    login: signIn,
    logout: signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
