/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { configureSessionHandlers } from '../../shared/api/httpClient.js'
import {
  clearSession as clearStoredSession,
  loadSession,
  saveSession as persistSession,
} from '../../shared/lib/session.js'
import { normalizePermissions } from '../../shared/lib/permissions.js'

const AuthContext = createContext(null)

function normalizeLoginSession(payload) {
  if (!payload?.accessToken || !payload?.refreshToken || !payload?.user) {
    return null
  }

  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: {
      id: payload.user.id,
      email: payload.user.email,
      role: payload.user.role,
      tenantId: payload.user.tenantId,
      permissions: normalizePermissions(payload.user.permissions),
    },
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession())
  const sessionRef = useRef(session)
  
  useEffect(() => {
    configureSessionHandlers({
      getSession: () => sessionRef.current,
      onSessionUpdate: (nextSession) => {
        sessionRef.current = nextSession
        persistSession(nextSession)
        setSession(nextSession)
      },
      onSessionClear: () => {
        sessionRef.current = null
        clearStoredSession()
        setSession(null)
        if (window.location.pathname.startsWith('/app')) {
          window.location.assign('/auth/login')
        }
      },
    })
  }, [])

  function saveSession(nextSession) {
    sessionRef.current = nextSession
    persistSession(nextSession)
    setSession(nextSession)
  }

  function login(nextPayload) {
    const normalized = normalizeLoginSession(nextPayload)

    if (!normalized) {
      throw new Error('Login response did not include a complete session payload.')
    }

    saveSession(normalized)
    return normalized
  }

  function logout() {
    sessionRef.current = null
    clearStoredSession()
    setSession(null)
  }

  const value = {
    session,
    isAuthenticated: Boolean(session?.accessToken && session?.refreshToken && session?.user),
    isBootstrapped: true,
    login,
    logout,
    saveSession,
    can: (resource, action) => {
      const permissions = sessionRef.current?.user?.permissions ?? {}
      const role = sessionRef.current?.user?.role

      if (!role) {
        return false
      }

      if (role === 'SUPER_ADMIN') {
        return true
      }

      const explicit = permissions[resource]
      if (Array.isArray(explicit) && explicit.length > 0) {
        return explicit.includes('ALL') || explicit.includes(action)
      }

      return false
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }

  return context
}
