import { createContext, useContext, useState, type PropsWithChildren } from 'react'

const SESSION_KEY = 'slf-members-hub:session'
const NAME_KEY = 'slf-members-hub:admin-name'

export const ADMIN_ROLE = 'Super Administrator'

type AuthState = {
  isAuthenticated: boolean
  adminName: string
  /** True for the first few seconds after a successful login — while the welcome overlay plays on top of the (already mounted) dashboard. */
  showWelcome: boolean
  login: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  /** Call once the welcome overlay has finished playing, to unmount it. */
  dismissWelcome: () => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === 'true',
  )
  const [adminName, setAdminName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? '')
  const [showWelcome, setShowWelcome] = useState(false)

  async function login(name: string, email: string, password: string) {
    // Client-side check against .env — no backend exists yet. This is a
    // placeholder gate, not real protection: the values below are bundled
    // into the public build and are readable by anyone via dev tools once
    // this is deployed. Move to a server-checked login before going live.
    const expectedEmail = import.meta.env.VITE_SUPER_ADMIN_EMAIL
    const expectedPassword = import.meta.env.VITE_SUPER_ADMIN_PASSWORD

    // simulate a network round-trip so the loading state has something to show
    await new Promise((resolve) => setTimeout(resolve, 500))

    const matches =
      email.trim().toLowerCase() === expectedEmail?.toLowerCase() && password === expectedPassword

    if (!matches) {
      return { ok: false, error: 'Invalid email or password' } as const
    }

    const trimmedName = name.trim()
    sessionStorage.setItem(NAME_KEY, trimmedName)
    sessionStorage.setItem(SESSION_KEY, 'true')
    setAdminName(trimmedName)
    setIsAuthenticated(true)
    setShowWelcome(true)
    return { ok: true } as const
  }

  function dismissWelcome() {
    setShowWelcome(false)
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(NAME_KEY)
    setIsAuthenticated(false)
    setAdminName('')
    setShowWelcome(false)
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, adminName, showWelcome, login, dismissWelcome, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
