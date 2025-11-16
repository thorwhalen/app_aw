/**
 * Authentication context for managing user session and tokens
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../services/api'

interface User {
  id: string
  username: string
  email: string
  full_name: string | null
  is_active: boolean
  is_superuser: boolean
  scopes: string[]
  created_at: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string, full_name?: string) => Promise<void>
  devLogin: () => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'aw_access_token'
const REFRESH_TOKEN_KEY = 'aw_refresh_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY)
  })
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(() => {
    return localStorage.getItem(REFRESH_TOKEN_KEY)
  })
  const [isLoading, setIsLoading] = useState(true)

  // Load user on mount if token exists
  useEffect(() => {
    if (token) {
      loadUser()
    } else {
      setIsLoading(false)
    }
  }, [])

  // Auto-refresh token before expiration (every 25 minutes for 30min tokens)
  useEffect(() => {
    if (!token || !refreshTokenValue) return

    const refreshInterval = setInterval(() => {
      refreshToken().catch((error) => {
        console.error('Auto token refresh failed:', error)
        logout()
      })
    }, 25 * 60 * 1000) // 25 minutes

    return () => clearInterval(refreshInterval)
  }, [token, refreshTokenValue])

  const loadUser = async () => {
    try {
      setIsLoading(true)
      const userData = await api.getCurrentUser()
      setUser(userData)
    } catch (error) {
      console.error('Failed to load user:', error)
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    const tokenResponse = await api.login(username, password)

    // Store tokens
    localStorage.setItem(TOKEN_KEY, tokenResponse.access_token)
    if (tokenResponse.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refresh_token)
      setRefreshTokenValue(tokenResponse.refresh_token)
    }

    setToken(tokenResponse.access_token)

    // Set token in API client
    api.setAuthToken(tokenResponse.access_token)

    // Load user data
    await loadUser()
  }

  const register = async (
    username: string,
    email: string,
    password: string,
    full_name?: string
  ) => {
    const userData = await api.register(username, email, password, full_name)
    console.log('User registered:', userData)

    // Auto-login after registration
    await login(username, password)
  }

  const devLogin = async () => {
    const tokenResponse = await api.devLogin()

    // Store tokens
    localStorage.setItem(TOKEN_KEY, tokenResponse.access_token)
    if (tokenResponse.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refresh_token)
      setRefreshTokenValue(tokenResponse.refresh_token)
    }

    setToken(tokenResponse.access_token)

    // Set token in API client
    api.setAuthToken(tokenResponse.access_token)

    // Load user data
    await loadUser()
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    setToken(null)
    setRefreshTokenValue(null)
    setUser(null)
    api.setAuthToken(null)
  }

  const refreshToken = async () => {
    if (!refreshTokenValue) {
      throw new Error('No refresh token available')
    }

    const tokenResponse = await api.refreshToken(refreshTokenValue)

    // Store new tokens
    localStorage.setItem(TOKEN_KEY, tokenResponse.access_token)
    if (tokenResponse.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokenResponse.refresh_token)
      setRefreshTokenValue(tokenResponse.refresh_token)
    }

    setToken(tokenResponse.access_token)

    // Set token in API client
    api.setAuthToken(tokenResponse.access_token)
  }

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    devLogin,
    logout,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
