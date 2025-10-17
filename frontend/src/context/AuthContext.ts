import { createContext } from 'react'
import type { AuthResponse, AuthUser } from '../api/auth'

export type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setAuthState: (auth: AuthResponse | null) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
