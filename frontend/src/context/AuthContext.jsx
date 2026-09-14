/**
 * DEVSIGHTAI — Authentication & RBAC Context (Phase 6)
 *
 * Provides:
 * - JWT Token management stored securely in memory
 * - Active user profile and role claim (developer, devops, qa, manager, admin)
 * - Quick role switcher for live demo presentations
 * - Automatic Authorization header attachment to API client
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

// Default demo profile for seamless offline/presentation use
const DEFAULT_DEMO_USER = {
  id: 'u-dev-001',
  email: 'developer@devsight.ai',
  full_name: 'Devin Coder',
  role: 'developer',
  is_active: true,
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_DEMO_USER)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(false)

  // Sync token with API client
  const updateAuth = useCallback((newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
    if (newToken) {
      api.setAuthToken(newToken)
    }
  }, [])

  // Login with credentials
  const login = async (email, password) => {
    setLoading(true)
    try {
      const res = await api.login({ email, password })
      if (res.access_token && res.user) {
        updateAuth(res.access_token, res.user)
        return res.user
      }
      throw new Error('Invalid login response')
    } finally {
      setLoading(false)
    }
  }

  // Quick switch role during presentations
  const switchRole = async (targetRole) => {
    try {
      const res = await api.demoSwitchRole(targetRole)
      if (res.access_token && res.user) {
        updateAuth(res.access_token, res.user)
        return res.user
      }
    } catch (err) {
      // Fallback local switch if network fails
      const fallbackUser = {
        id: `u-${targetRole}-demo`,
        email: `${targetRole}@devsight.ai`,
        full_name: `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} User`,
        role: targetRole,
        is_active: true,
      }
      setUser(fallbackUser)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(DEFAULT_DEMO_USER)
    api.setAuthToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'developer',
        token,
        loading,
        login,
        logout,
        switchRole,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
