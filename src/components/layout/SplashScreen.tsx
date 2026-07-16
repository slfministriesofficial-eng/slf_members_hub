import { useEffect, useState } from 'react'
import slfLogo from '../../assets/slf_logo_cropped.png'

const HOLD_MS = 2200
const FADE_MS = 400

// Shown once per cold app launch (page load), on top of the app which is
// already mounting underneath — mirrors the same overlay-reveal pattern
// WelcomeTransition uses, just unconditional on auth state since this is
// meant to stand in for a native app's launch splash, not a "welcome back".
export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const leaveTimer = setTimeout(() => setLeaving(true), HOLD_MS)
    const removeTimer = setTimeout(() => setVisible(false), HOLD_MS + FADE_MS)
    return () => {
      clearTimeout(leaveTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-300 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img
        src={slfLogo}
        alt="SLF Ministries"
        className="motion-safe:animate-[scale-in_0.5s_ease-out_both] h-24 w-24"
      />

      <h1
        className="motion-safe:animate-[fade-rise_0.5s_ease-out_150ms_both] mt-5 font-display text-[22px] font-bold tracking-tight"
        style={{ color: '#0F172A' }}
      >
        SLF Members Hub
      </h1>

      <p
        className="motion-safe:animate-[fade-rise_0.5s_ease-out_250ms_both] mt-1.5 text-[13.5px] font-medium"
        style={{ color: '#6B7280' }}
      >
        Sarah Living Faith Ministries
      </p>

      <p
        className="motion-safe:animate-[fade-rise_0.5s_ease-out_350ms_both] mt-1 text-[11.5px] tracking-wide"
        style={{ color: '#6B7280' }}
      >
        Connecting Members &bull; Building Faith
      </p>

      <div className="motion-safe:animate-[fade-rise_0.5s_ease-out_450ms_both] absolute bottom-14 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="motion-safe:animate-[pulse-soft_1.1s_ease-in-out_infinite] h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: '#D4AF37', animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
