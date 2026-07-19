import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import slfLogo from '../assets/slf_logo_cropped.png'

/**
 * Shown after an attendance taker signs out. They log in via a private WhatsApp
 * link (not a password), so the admin login form would be a dead end for them —
 * this branded screen tells them to reopen their link instead.
 */
export function SignedOutScreen() {
  const navigate = useNavigate()
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: (i * 37) % 100,
        size: 3 + (i % 4),
        delay: (i % 6) * 0.5,
        duration: 7 + (i % 5),
      })),
    [],
  )

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-ink-deep via-ink to-ink-soft px-6 text-center">
      {/* light rays */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="motion-safe:animate-[ray-drift_10s_ease-in-out_infinite] absolute -left-1/4 top-[-20%] h-[140%] w-1/3 -rotate-[18deg] bg-gradient-to-b from-white/10 via-white/0 to-transparent" />
        <div className="motion-safe:animate-[ray-drift_13s_ease-in-out_infinite_1.2s] absolute left-1/2 top-[-20%] h-[140%] w-1/4 -rotate-[10deg] bg-gradient-to-b from-brass/20 via-transparent to-transparent" />
      </div>

      {/* floating gold particles */}
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

      {/* logo in a breathing gold glow + slow dashed halo */}
      <div className="relative z-10 mb-8 flex items-center justify-center">
        <div className="motion-safe:animate-[pulse-soft_1.8s_ease-in-out_infinite] absolute h-44 w-44 rounded-full bg-brass/40 blur-2xl" />
        <div className="motion-safe:animate-[spin-slow_18s_linear_infinite] absolute h-[9rem] w-[9rem] rounded-full border-2 border-dashed border-brass/45" />
        <div className="motion-safe:animate-[scale-in_0.6s_ease-out_both] relative h-28 w-28 overflow-hidden rounded-full bg-white shadow-[0_0_48px_rgba(212,169,76,0.55)] ring-2 ring-brass/80">
          <img src={slfLogo} alt="Sarah Living Faith Ministries" className="h-full w-full object-cover" />
        </div>
      </div>

      <h1 className="motion-safe:animate-[scale-in_0.7s_cubic-bezier(0.34,1.56,0.64,1)_200ms_both] relative z-10 font-display text-[30px] font-bold tracking-tight text-white">
        Signed out
      </h1>
      <div className="motion-safe:animate-[fade-rise_0.5s_ease-out_500ms_both] relative z-10 mt-4 h-[2px] w-10 rounded-full bg-brass/70" />
      <p className="motion-safe:animate-[fade-rise_0.6s_ease-out_600ms_both] relative z-10 mt-4 max-w-[300px] text-[13.5px] leading-relaxed text-white/80">
        Thank you for helping take attendance. To sign back in, just open your personal invite link again.
      </p>
      <p className="motion-safe:animate-[fade-rise_0.6s_ease-out_800ms_both] relative z-10 mt-6 text-[13px] font-semibold text-brass">
        Sarah Living Faith Ministries
      </p>

      <button
        onClick={() => navigate('/taker-login', { replace: true })}
        className="motion-safe:animate-[fade-rise_0.6s_ease-out_1000ms_both] relative z-10 mt-8 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brass to-brass-deep px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(184,134,58,0.4)] transition-transform hover:scale-105"
      >
        <Icon name="logout" className="icon !h-[14px] !w-[14px] rotate-180" />
        Sign in
      </button>
    </div>
  )
}
