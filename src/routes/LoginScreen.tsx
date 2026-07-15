import { useState, type FormEvent } from 'react'
import { Icon } from '../components/ui/Icon'
import { useAuth } from '../auth/AuthContext'

export function LoginScreen() {
  const { login } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(name, email, password)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
    }
    // On success, AuthContext flips isAuthenticated + showWelcome — App.tsx
    // swaps this screen out for the dashboard + welcome overlay automatically.
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-ink-deep via-ink to-ink-soft px-5 py-10">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brass/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-ink-soft/60 blur-3xl" />

      <div className="motion-safe:animate-[fade-rise_0.5s_ease-out] relative w-full max-w-[400px] rounded-[28px] bg-white p-7 shadow-elev sm:p-9">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-deep">
            <span className="h-2.5 w-2.5 rounded-full bg-brass" />
          </div>
          <h1 className="font-display text-[22px] font-bold text-ink">SLF Members Hub</h1>
          <p className="mt-1 text-[13px] text-slate">Super Admin sign in</p>
        </div>

        {error && (
          <div className="motion-safe:animate-[fade-rise_0.3s_ease-out] mb-4 rounded-xl bg-status-alert-bg px-3.5 py-2.5 text-[12.5px] font-semibold text-status-alert-fg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
              Full name
            </span>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prem Kumar"
              className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-slate focus:border-ink"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
              Email address
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@slf.hub.com"
              className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-slate focus:border-ink"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
              Password
            </span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 pr-11 text-[14px] text-ink outline-none transition-colors placeholder:text-slate focus:border-ink"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate"
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} className="icon !h-[18px] !w-[18px]" />
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-[14px] font-bold text-white transition-opacity disabled:opacity-70"
          >
            {loading && (
              <span className="motion-safe:animate-[spin-slow_0.7s_linear_infinite] h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
            )}
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11.5px] text-slate">
          <Icon name="lock-small" className="icon !h-[13px] !w-[13px]" />
          Admin access only · no member logins
        </p>
      </div>
    </div>
  )
}
