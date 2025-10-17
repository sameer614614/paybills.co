import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loginUser, type AuthResponse } from '../api/auth'
import { AuthContext } from './AuthContext'

type AuthProviderProps = {
  children: ReactNode
}

function getInitialAuth(): { token: string | null; user: AuthResponse['user'] | null } {
  if (typeof window === 'undefined') {
    return { token: null, user: null }
  }

  const stored = window.localStorage.getItem('pbwu.auth')
  if (!stored) {
    return { token: null, user: null }
  }
  try {
    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to parse auth state', error)
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [{ token: initialToken, user: initialUser }] = useState(getInitialAuth)
  const [token, setToken] = useState<string | null>(initialToken)
  const [user, setUser] = useState<AuthResponse['user'] | null>(initialUser)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const payload = JSON.stringify({ token, user })
    window.localStorage.setItem('pbwu.auth', payload)
  }, [token, user])

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const { token: newToken, user: newUser } = await loginUser({ email, password })
      setToken(newToken)
      setUser(newUser)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('pbwu.auth')
    }
  }, [])

  const setAuthState = useCallback(
    (auth: AuthResponse | null) => {
      if (!auth) {
        logout()
        return
      }
      setToken(auth.token)
      setUser(auth.user)
    },
    [logout],
  )

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      login,
      logout,
      setAuthState,
    }),
    [user, token, loading, login, logout, setAuthState],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
