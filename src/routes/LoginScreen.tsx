import { useState, type FormEvent } from 'react'
import { Icon } from '../components/ui/Icon'
import { useAuth } from '../auth/AuthContext'
import slfLogo from '../assets/slf_logo.png'

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

  const inputClass =
    'w-full rounded-full border border-hairline bg-white py-3 pl-11 pr-4 text-[14px] text-ink outline-none transition-all placeholder:text-slate/60 focus:border-brass focus:ring-2 focus:ring-brass/15 lg:py-[clamp(0.9rem,1.8dvh,1.25rem)] lg:pl-14 lg:pr-5 lg:text-[16px]'

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white">
      {/* ── Mobile: curved header ── */}
      <header className="relative shrink-0 overflow-hidden px-5 pb-12 pt-0 text-center lg:flex lg:h-[clamp(20rem,44dvh,29rem)] lg:flex-col lg:items-center lg:justify-center lg:pb-[clamp(3.5rem,8dvh,5.5rem)] lg:pt-0">
        {/* Animated background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="motion-safe:animate-[gradient-drift_10s_ease_infinite] absolute inset-0 bg-gradient-to-br from-brass via-[#d4a040] to-brass-deep bg-[length:250%_250%]" />
          <div className="motion-safe:animate-[ray-drift_8s_ease-in-out_infinite] absolute -left-1/4 top-0 h-full w-1/2 -rotate-12 bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
          <div className="motion-safe:animate-[ray-drift_11s_ease-in-out_infinite_1.2s] absolute -right-1/4 top-0 h-full w-1/2 rotate-12 bg-gradient-to-b from-white/15 via-transparent to-transparent" />
          <div className="motion-safe:animate-[pulse-soft_4s_ease-in-out_infinite] absolute -left-12 top-4 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="motion-safe:animate-[pulse-soft_5.5s_ease-in-out_infinite_1.5s] absolute -right-10 top-10 h-32 w-32 rounded-full bg-[#E4C57E]/35 blur-2xl" />
          <div className="motion-safe:animate-[float-soft_6s_ease-in-out_infinite] absolute left-1/3 top-1/4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <div className="motion-safe:animate-[particle-float_9s_ease-in-out_infinite] absolute left-[18%] bottom-10 h-2 w-2 rounded-full bg-white/50" />
          <div className="motion-safe:animate-[particle-float_11s_ease-in-out_infinite_2s] absolute left-[52%] bottom-6 h-1.5 w-1.5 rounded-full bg-white/40" />
          <div className="motion-safe:animate-[particle-float_10s_ease-in-out_infinite_4s] absolute right-[22%] bottom-12 h-2 w-2 rounded-full bg-white/35" />
        </div>

        <img
          src={slfLogo}
          alt="Sarah Living Faith Ministries"
          className="relative z-10 mx-auto -mb-14 h-72 w-72 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.25)] max-[380px]:h-64 max-[380px]:w-64 lg:-mb-[clamp(3rem,7dvh,4rem)] lg:h-[clamp(18rem,34dvh,22rem)] lg:w-[clamp(18rem,34dvh,22rem)]"
        />

        <h1 className="relative z-10 font-display text-[24px] font-bold leading-tight text-white lg:text-[30px]">Welcome Back</h1>
        <p className="relative z-10 mt-0.5 text-[13px] font-semibold text-white/90 lg:text-[16px]">SLF Members Hub</p>

        <div
          aria-hidden
          className="absolute -bottom-10 left-1/2 z-10 h-20 w-[145%] -translate-x-1/2 rounded-t-[100%] bg-white lg:-bottom-14 lg:h-28 lg:w-[130%]"
        />
      </header>

      {/* ── Form area ── */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-5 pb-4 pt-0 lg:items-center lg:px-12 lg:pb-[clamp(1rem,3dvh,2.5rem)]">
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 hidden h-64 w-64 rounded-full bg-brass/10 blur-3xl lg:block"
        />

        <div className="motion-safe:animate-[fade-rise_0.5s_ease-out] relative flex min-h-0 w-full max-w-[420px] flex-1 flex-col lg:max-w-[560px]">
          <div className="flex min-h-0 flex-1 flex-col justify-start pt-2 lg:pt-[clamp(0.25rem,1.5dvh,1rem)]">
            {error && (
              <div className="motion-safe:animate-[fade-rise_0.3s_ease-out] mb-3 rounded-2xl border border-status-alert-fg/15 bg-status-alert-bg px-4 py-2.5 text-[12.5px] font-semibold text-status-alert-fg lg:mb-5 lg:py-3 lg:text-[13px]">
                {error}
              </div>
            )}

            <h2 className="relative z-20 -mt-1 mb-1.5 text-center font-display text-[20px] font-bold text-ink lg:-mt-[clamp(0.25rem,1dvh,0.75rem)] lg:mb-[clamp(0.75rem,1.6dvh,1.25rem)] lg:text-[28px]">
              Login to SLF Hub
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 lg:gap-[clamp(0.9rem,2dvh,1.5rem)]">
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink lg:mb-2 lg:text-[13px] lg:font-bold lg:uppercase lg:tracking-[0.14em] lg:text-slate">
                  Full name
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate/50">
                    <Icon name="user" className="icon !h-[18px] !w-[18px] lg:!h-[22px] lg:!w-[22px]" />
                  </span>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className={inputClass}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink lg:mb-2 lg:text-[13px] lg:font-bold lg:uppercase lg:tracking-[0.14em] lg:text-slate">
                  Email
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate/50">
                    <Icon name="mail" className="icon !h-[18px] !w-[18px] lg:!h-[22px] lg:!w-[22px]" />
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={inputClass}
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink lg:mb-2 lg:text-[13px] lg:font-bold lg:uppercase lg:tracking-[0.14em] lg:text-slate">
                  Password
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate/50">
                    <Icon name="lock" className="icon !h-[18px] !w-[18px] lg:!h-[22px] lg:!w-[22px]" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate transition-colors hover:text-brass"
                  >
                    <Icon name={showPassword ? 'eye-off' : 'eye'} className="icon !h-[18px] !w-[18px] lg:!h-[22px] lg:!w-[22px]" />
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brass to-brass-deep py-3.5 text-[14px] font-bold text-white shadow-[0_10px_28px_rgba(184,134,58,0.35)] transition-all hover:brightness-105 disabled:opacity-70 disabled:hover:brightness-100 lg:mt-2 lg:py-[clamp(0.9rem,1.8dvh,1.25rem)] lg:text-[16px]"
              >
                {loading && (
                  <span className="motion-safe:animate-[spin-slow_0.7s_linear_infinite] h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                )}
                {loading ? 'Signing in…' : 'Log in'}
              </button>
            </form>

            <p className="mt-3 flex shrink-0 items-center justify-center gap-1.5 text-[10.5px] text-slate">
              <Icon name="lock-small" className="icon !h-[13px] !w-[13px] text-brass" />
              Admin access only · no member logins
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
