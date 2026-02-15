import { createContext, useContext, useState, type ReactNode } from 'react'
import { api, type User, type Organization, type RegisterInput, type LoginInput, type SetPasswordInput } from '../lib/api'

interface AuthContextValue {
  user: User | null
  organization: Organization | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  setPassword: (input: SetPasswordInput) => Promise<void>
  logout: () => void
  
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_KEY = 'auth_user'
const AUTH_ORG_KEY = 'auth_organization'

// Helper functions to load from localStorage
function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

function getStoredUser(): User | null {
  const stored = localStorage.getItem(AUTH_USER_KEY)
  return stored ? JSON.parse(stored) : null
}

function getStoredOrganization(): Organization | null {
  const stored = localStorage.getItem(AUTH_ORG_KEY)
  return stored ? JSON.parse(stored) : null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use lazy initialization to avoid useEffect
  const [user, setUser] = useState<User | null>(getStoredUser)
  const [organization, setOrganization] = useState<Organization | null>(getStoredOrganization)
  const [token, setToken] = useState<string | null>(getStoredToken)
  const [isLoading] = useState(false)

  const saveAuthState = (authToken: string, authUser: User, authOrg: Organization) => {
    localStorage.setItem(AUTH_TOKEN_KEY, authToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser))
    localStorage.setItem(AUTH_ORG_KEY, JSON.stringify(authOrg))
    setToken(authToken)
    setUser(authUser)
    setOrganization(authOrg)
  }

  const login = async (input: LoginInput) => {
    const response = await api.login(input)
    saveAuthState(response.token, response.user, response.organization)
  }

  const register = async (input: RegisterInput) => {
    const response = await api.register(input)
    saveAuthState(response.token, response.user, response.organization)
  }

  const setPassword = async (input: SetPasswordInput) => {
    const response = await api.setPassword(input)
    saveAuthState(response.data.token, response.data.user, response.data.organization)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    localStorage.removeItem(AUTH_ORG_KEY)
    setToken(null)
    setUser(null)
    setOrganization(null)
  }

  const value: AuthContextValue = {
    user,
    organization,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    register,
    setPassword,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
