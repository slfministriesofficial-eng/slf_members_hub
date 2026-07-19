import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { verifyAttendanceTaker, signInTakerByEmail } from '../attendance/api'

const SESSION_KEY = 'slf-members-hub:session'
const NAME_KEY = 'slf-members-hub:admin-name'
// Attendance-taker magic-link token — in localStorage (not sessionStorage) so
// a volunteer stays signed in across app restarts. Re-verified on every boot,
// so revoking access still locks them out on their next launch.
const TAKER_TOKEN_KEY = 'slf-members-hub:taker-token'
const TAKER_EMAIL_KEY = 'slf-members-hub:taker-email'
const TAKER_NAME_KEY = 'slf-members-hub:taker-name'

export const ADMIN_ROLE = 'Super Administrator'

export type UserRole = 'admin' | 'attendance-taker' | null

type AuthState = {
  isAuthenticated: boolean
  role: UserRole
  adminName: string
  /** The attendance taker's email once signed in via a magic link. */
  takerEmail: string
  /** The attendance taker's name (for the welcome greeting), if on file. */
  takerName: string
  /** True while a stored taker token is being re-verified on boot — hold the
   *  login screen until this settles so a signed-in taker doesn't flash it. */
  authChecking: boolean
  /** True for the first few seconds after a successful login — while the welcome overlay plays on top of the (already mounted) dashboard. */
  showWelcome: boolean
  login: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  /** Sign in an attendance taker from a magic-link token. */
  loginAsTaker: (token: string) => Promise<{ ok: true } | { ok: false; error: string }>
  /** Sign in an attendance taker by email (backend checks they're active). */
  loginTakerByEmail: (name: string, email: string) => Promise<{ ok: true } | { ok: false; error: string }>
  /** Call once the welcome overlay has finished playing, to unmount it. */
  dismissWelcome: () => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const hasAdminSession = () => sessionStorage.getItem(SESSION_KEY) === 'true'
  const hasStoredTakerToken = () => !!localStorage.getItem(TAKER_TOKEN_KEY)

  const [role, setRole] = useState<UserRole>(() => (hasAdminSession() ? 'admin' : null))
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasAdminSession())
  const [adminName, setAdminName] = useState(() => sessionStorage.getItem(NAME_KEY) ?? '')
  const [takerEmail, setTakerEmail] = useState(() => localStorage.getItem(TAKER_EMAIL_KEY) ?? '')
  const [takerName, setTakerName] = useState(() => localStorage.getItem(TAKER_NAME_KEY) ?? '')
  const [showWelcome, setShowWelcome] = useState(false)
  // If a taker token is stored and there's no admin session, we must verify it
  // before deciding what to render — start in the checking state in that case.
  const [authChecking, setAuthChecking] = useState(() => !hasAdminSession() && hasStoredTakerToken())

  // Boot: re-verify a stored taker token against the backend (so a revoked
  // taker is locked out). Admin sessions are trusted synchronously above.
  useEffect(() => {
    if (hasAdminSession() || !hasStoredTakerToken()) return
    let cancelled = false
    const token = localStorage.getItem(TAKER_TOKEN_KEY) as string
    verifyAttendanceTaker(token)
      .then((res) => {
        if (cancelled) return
        if (res.ok && res.email) {
          localStorage.setItem(TAKER_EMAIL_KEY, res.email)
          setTakerEmail(res.email)
          if (res.name) {
            localStorage.setItem(TAKER_NAME_KEY, res.name)
            setTakerName(res.name)
          }
          setRole('attendance-taker')
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem(TAKER_TOKEN_KEY)
          localStorage.removeItem(TAKER_EMAIL_KEY)
          localStorage.removeItem(TAKER_NAME_KEY)
        }
      })
      .catch(() => {
        // Network hiccup — don't lock out a taker who was valid last launch.
        // Trust the stored email but let the next launch re-verify.
        if (cancelled) return
        const email = localStorage.getItem(TAKER_EMAIL_KEY)
        if (email) {
          setTakerEmail(email)
          setRole('attendance-taker')
          setIsAuthenticated(true)
        }
      })
      .finally(() => {
        if (!cancelled) setAuthChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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
    setRole('admin')
    setIsAuthenticated(true)
    setShowWelcome(true)
    return { ok: true } as const
  }

  async function loginAsTaker(token: string) {
    try {
      const res = await verifyAttendanceTaker(token)
      if (!res.ok || !res.email) {
        return { ok: false, error: 'This attendance link is no longer valid. Ask the church office for a new one.' } as const
      }
      localStorage.setItem(TAKER_TOKEN_KEY, token)
      localStorage.setItem(TAKER_EMAIL_KEY, res.email)
      setTakerEmail(res.email)
      localStorage.setItem(TAKER_NAME_KEY, res.name ?? '')
      setTakerName(res.name ?? '')
      setRole('attendance-taker')
      setIsAuthenticated(true)
      setAuthChecking(false)
      setShowWelcome(true)
      return { ok: true } as const
    } catch {
      return { ok: false, error: 'Could not verify the link — check your connection and try again.' } as const
    }
  }

  async function loginTakerByEmail(name: string, email: string) {
    try {
      const res = await signInTakerByEmail(email.trim().toLowerCase())
      if (!res.ok || !res.token || !res.email) {
        return {
          ok: false,
          error: "That email isn't registered as an attendance taker. Please check with the church office.",
        } as const
      }
      const displayName = name.trim() || res.name || ''
      localStorage.setItem(TAKER_TOKEN_KEY, res.token)
      localStorage.setItem(TAKER_EMAIL_KEY, res.email)
      localStorage.setItem(TAKER_NAME_KEY, displayName)
      setTakerEmail(res.email)
      setTakerName(displayName)
      setRole('attendance-taker')
      setIsAuthenticated(true)
      setAuthChecking(false)
      setShowWelcome(true)
      return { ok: true } as const
    } catch {
      return {
        ok: false,
        error:
          "Sign-in isn't available yet — the latest app update needs to be deployed. Please tell the church office (or use your invite link for now).",
      } as const
    }
  }

  function dismissWelcome() {
    setShowWelcome(false)
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(NAME_KEY)
    localStorage.removeItem(TAKER_TOKEN_KEY)
    localStorage.removeItem(TAKER_EMAIL_KEY)
    localStorage.removeItem(TAKER_NAME_KEY)
    setAdminName('')
    setTakerEmail('')
    setTakerName('')
    setRole(null)
    setIsAuthenticated(false)
    setShowWelcome(false)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        role,
        adminName,
        takerEmail,
        takerName,
        authChecking,
        showWelcome,
        login,
        loginAsTaker,
        loginTakerByEmail,
        dismissWelcome,
        logout,
      }}
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
