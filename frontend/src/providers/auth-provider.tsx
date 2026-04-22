import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { clearToken, getToken, saveToken, api } from '@/lib/api'

type AuthUser = {
  id: string
  username: string
  nameZh: string
  role: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  useEffect(() => {
    const token = getToken()
    if (!token) return

    void api
      .get<AuthUser>('/auth/me')
      .then((response) => setUser(response.data))
      .catch(() => {
        clearToken()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (token: string) => {
    saveToken(token)
    const response = await api.get<AuthUser>('/auth/me')
    setUser(response.data)
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
