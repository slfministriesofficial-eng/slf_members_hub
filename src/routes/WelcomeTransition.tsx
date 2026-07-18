import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { getTimeGreeting } from '../utils/initials'
import { useAuth } from '../auth/AuthContext'
import slfLogo from '../assets/slf_logo_cropped.png'

const SLOGAN = 'Your entire church, in one pocket.'
const CONTENT_MS = 4000
const REVEAL_MS = 1000

function useParticles(count: number) {
  return useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 3 + Math.random() * 5,
        delay: Math.random() * 3,
        duration: 7 + Math.random() * 5,
      })),
    [count],
  )
}

export function WelcomeTransition() {
  const { adminName, takerName, role, dismissWelcome } = useAuth()
  const isTaker = role === 'attendance-taker'
  const name = isTaker ? takerName || 'Friend' : adminName || 'Admin'
  const subtitle = isTaker ? "You're all set to take attendance" : null
  const greeting = useMemo(getTimeGreeting, [])
  const particles = useParticles(12)
  const [revealing, setRevealing] = useState(false)

  useEffect(() => {
    const revealTimer = setTimeout(() => setRevealing(true), CONTENT_MS)
    const dismissTimer = setTimeout(() => dismissWelcome(), CONTENT_MS + REVEAL_MS)
    return () => {
      clearTimeout(revealTimer)
      clearTimeout(dismissTimer)
    }
  }, [dismissWelcome])

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden bg-gradient-to-br from-ink-deep via-ink to-ink-soft ${
        revealing ? 'motion-safe:animate-[fade-out_300ms_ease-in-out_700ms_forwards]' : ''
      }`}
    >
      {/* soft light rays */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="motion-safe:animate-[ray-drift_10s_ease-in-out_infinite] absolute -left-1/4 top-[-20%] h-[140%] w-1/3 -rotate-[18deg] bg-gradient-to-b from-white/10 via-white/0 to-transparent" />
        <div className="motion-safe:animate-[ray-drift_13s_ease-in-out_infinite_1.2s] absolute left-1/2 top-[-20%] h-[140%] w-1/4 -rotate-[10deg] bg-gradient-to-b from-brass/20 via-transparent to-transparent" />
      </div>

      {/* floating light particles */}
      <div className="pointer-events-none absolute inset-0">
        {particles.map((p) => (
          <span
            key={p.id}
            className="motion-safe:animate-[particle-float_8s_ease-in-out_infinite] absolute rounded-full"
            style={{
              left: `${p.left}%`,
              bottom: '-12px',
              width: p.size,
              height: p.size,
              background: 'rgba(212,169,76,0.55)',
              filter: 'blur(1px)',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* ambient center glow */}
      <div className="motion-safe:animate-[pulse-soft_2.6s_ease-in-out_infinite] pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass/25 blur-3xl" />

      {/* greeting content */}
      <div
        className={`relative z-10 flex h-full flex-col items-center justify-center px-6 text-center transition-opacity duration-300 ${
          revealing ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* The church logo in a breathing gold glow, wrapped by a slowly
            turning dashed halo — replaces the old placeholder tile. */}
        <div className="relative mb-8 flex items-center justify-center">
          <div className="motion-safe:animate-[pulse-soft_1.8s_ease-in-out_infinite] absolute h-40 w-40 rounded-full bg-brass/40 blur-2xl" />
          <div className="motion-safe:animate-[spin-slow_18s_linear_infinite] absolute h-[8.25rem] w-[8.25rem] rounded-full border-2 border-dashed border-brass/45 lg:h-[9.5rem] lg:w-[9.5rem]" />
          <div className="motion-safe:animate-[scale-in_0.6s_ease-out_both] relative h-[6.5rem] w-[6.5rem] overflow-hidden rounded-full bg-white shadow-[0_0_44px_rgba(212,169,76,0.5)] ring-2 ring-brass/80 lg:h-[7.5rem] lg:w-[7.5rem]">
            <img src={slfLogo} alt="Sarah Living Faith Ministries" className="h-full w-full object-cover" />
          </div>
        </div>

        <p className="motion-safe:animate-[fade-rise_0.6s_ease-out_300ms_both] relative flex items-center gap-2 text-[16px] font-bold uppercase tracking-wide text-white/85">
          <Icon name={greeting.icon} className="icon !h-[18px] !w-[18px] text-brass" />
          {greeting.text},
        </p>

        <h1 className="motion-safe:animate-[scale-in_0.7s_cubic-bezier(0.34,1.56,0.64,1)_600ms_both] relative mt-2 font-display text-[38px] font-bold tracking-tight text-white">
          {name}
        </h1>

        <div className="motion-safe:animate-[fade-rise_0.5s_ease-out_1000ms_both] relative mt-5 h-[2px] w-10 rounded-full bg-brass/70" />

        <p className="motion-safe:animate-[fade-rise_0.5s_ease-out_1100ms_both] relative mt-5 text-[15px] font-semibold text-white/90">
          {subtitle ?? (
            <>
              Welcome to <span className="font-bold text-brass">SLF Members Hub</span>
            </>
          )}
        </p>

        <p className="motion-safe:animate-[fade-rise_0.6s_ease-out_1300ms_both] relative mt-3 text-[13px] italic text-white/60 [text-shadow:0_0_16px_rgba(212,169,76,0.35)]">
          "{SLOGAN}"
        </p>
      </div>

      {/* circular pop reveal */}
      {revealing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="motion-safe:animate-[reveal-pop_1000ms_cubic-bezier(0.65,0,0.35,1)_forwards] h-3 w-3 rounded-full bg-gradient-to-br from-white via-brass to-ink-deep shadow-[0_0_80px_28px_rgba(212,169,76,0.55)]" />
        </div>
      )}
    </div>
  )
}
