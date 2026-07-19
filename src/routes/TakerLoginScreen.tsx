import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { useAuth } from '../auth/AuthContext'
import slfLogo from '../assets/slf_logo.png'

/**
 * Attendance-taker sign-in — same look as the admin login, but no password:
 * name + email only. The backend checks the email is on the active attendance-
 * takers list; if so, the taker is signed in. Reached from the signed-out
 * screen (takers have no password and may not have their link handy).
 */
export function TakerLoginScreen() {
  const { loginTakerByEmail } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await loginTakerByEmail(name, email)
    setLoading(false)
    if (result.ok) navigate('/attendance', { replace: true })
    else setError(result.error)
  }

  const inputClass =
    'w-full rounded-full border border-hairline bg-white py-3 pl-11 pr-4 text-[14px] text-ink outline-none transition-all placeholder:text-slate/60 focus:border-brass focus:ring-2 focus:ring-brass/15 lg:py-3.5 lg:pl-12 lg:text-[15px]'

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white lg:flex-row">
      {/* Gold branding header / left panel */}
      <header className="relative shrink-0 overflow-hidden px-5 pb-12 pt-0 text-center lg:flex lg:h-full lg:w-1/2 lg:shrink lg:flex-col lg:items-center lg:justify-center lg:px-12 lg:pb-0">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="motion-safe:animate-[gradient-drift_10s_ease_infinite] absolute inset-0 bg-gradient-to-br from-brass via-[#d4a040] to-brass-deep bg-[length:250%_250%]" />
          <div className="motion-safe:animate-[ray-drift_8s_ease-in-out_infinite] absolute -left-1/4 top-0 h-full w-1/2 -rotate-12 bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
          <div className="motion-safe:animate-[pulse-soft_4s_ease-in-out_infinite] absolute -left-12 top-4 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
          <div className="motion-safe:animate-[pulse-soft_5.5s_ease-in-out_infinite_1.5s] absolute -right-10 top-10 h-32 w-32 rounded-full bg-[#E4C57E]/35 blur-2xl" />
        </div>

        <img
          src={slfLogo}
          alt="Sarah Living Faith Ministries"
          className="relative z-20 mx-auto -mb-16 h-80 w-80 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.25)] max-[380px]:h-72 max-[380px]:w-72 lg:-mb-20 lg:h-[clamp(22rem,52dvh,32rem)] lg:w-[clamp(22rem,52dvh,32rem)]"
        />

        <p className="relative z-20 text-[13px] font-bold uppercase tracking-[0.22em] text-white/85 lg:text-[14px]">
          Attendance Taker
        </p>
        <h1 className="relative z-20 mt-1 font-display text-[30px] font-bold leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.25)] max-[380px]:text-[26px] lg:mt-2 lg:text-[44px]">
          SLF Members Hub
        </h1>

        <div
          aria-hidden
          className="absolute -bottom-10 left-1/2 z-10 h-20 w-[145%] -translate-x-1/2 rounded-t-[100%] bg-white lg:hidden"
        />
      </header>

      {/* Form area */}
      <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-5 pb-4 pt-0 lg:h-full lg:items-center lg:justify-center lg:px-12 lg:pb-8 lg:pt-8">
        <div className="motion-safe:animate-[fade-rise_0.5s_ease-out] relative flex min-h-0 w-full max-w-[420px] flex-1 flex-col self-center lg:max-w-[440px] lg:flex-none">
          <div className="flex min-h-0 flex-1 flex-col justify-start pt-2 lg:flex-none lg:pt-0">
            {error && (
              <div className="motion-safe:animate-[fade-rise_0.3s_ease-out] mb-3 rounded-2xl border border-status-alert-fg/15 bg-status-alert-bg px-4 py-2.5 text-[12.5px] font-semibold text-status-alert-fg lg:mb-5 lg:py-3 lg:text-[13px]">
                {error}
              </div>
            )}

            <h2 className="relative z-20 -mt-1 mb-1.5 text-center font-display text-[20px] font-extrabold text-ink lg:mb-6 lg:mt-0 lg:text-[28px]">
              Attendance Sign In
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 lg:gap-4">
              <label className="block">
                <span className="mb-1 block text-[12px] font-semibold text-ink lg:mb-2 lg:text-[13px] lg:font-bold lg:uppercase lg:tracking-[0.14em] lg:text-slate">
                  Full name <span className="font-normal normal-case tracking-normal text-slate/70">(optional)</span>
                </span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate/50">
                    <Icon name="user" className="icon !h-[18px] !w-[18px] lg:!h-[22px] lg:!w-[22px]" />
                  </span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Optional — we'll use your registered name"
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
                    placeholder="Enter your registered email"
                    className={inputClass}
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brass to-brass-deep py-3.5 text-[14px] font-bold text-white shadow-[0_10px_28px_rgba(184,134,58,0.35)] transition-all hover:brightness-105 disabled:opacity-70 lg:mt-2 lg:py-4 lg:text-[15px]"
              >
                {loading && (
                  <span className="motion-safe:animate-[spin-slow_0.7s_linear_infinite] h-4 w-4 rounded-full border-2 border-white/30 border-t-white" />
                )}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-3 flex shrink-0 items-center justify-center gap-1.5 text-[10.5px] text-slate">
              <Icon name="lock-small" className="icon !h-[13px] !w-[13px] text-brass" />
              Attendance takers only · access granted by the church office
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
