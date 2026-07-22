import { createContext, useContext, useEffect, useState } from 'react'
import { getCurrentUser, logoutUser } from '../services/auth'
import type { AuthUser } from '../types/auth'

type AuthContextValue = {
  user: AuthUser | null
  authenticated: boolean
  loading: boolean
  refreshAuth: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshAuth = async () => {
    try {
      const response = await getCurrentUser()

      if (response.authenticated && response.user) {
        setUser(response.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('AUTH CHECK ERROR:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    await logoutUser()
    setUser(null)
  }

  useEffect(() => {
    refreshAuth()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated: Boolean(user),
        loading,
        refreshAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}