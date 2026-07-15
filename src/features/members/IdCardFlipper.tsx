import { useEffect, useState } from 'react'
import type { MemberStatus } from '../../components/ui/StatusPill'
import { IdCard } from './IdCard'
import { IdCardBack } from './IdCardBack'

type IdCardFlipperProps = {
  name: string
  memberId: string
  mobile?: string
  bloodGroup?: string
  status: MemberStatus
  statusLabel: string
  sinceYear?: string
  hideMobile?: boolean
  // Optional external control — omit these for the default self-contained
  // behavior (own bottom Front/Back toggle); pass them when a parent screen
  // wants its own toggle elsewhere and just needs the card to follow it.
  flipped?: boolean
  onFlipChange?: (flipped: boolean) => void
  hideToggle?: boolean
}

// Wraps the front (IdCard) and back (IdCardBack) faces with a tap-to-flip
// toggle, so the same card can show member details or org/contact info.
export function IdCardFlipper({ flipped: controlledFlipped, onFlipChange, hideToggle, ...cardProps }: IdCardFlipperProps) {
  // Spins (not a plain flipped boolean) so the card always spins forward —
  // never snaps backward — no matter how many times it's toggled, from either
  // an internal tap or an external controller. flipped is just spins' parity.
  const [spins, setSpins] = useState(0)
  const flipped = spins % 2 === 1

  useEffect(() => {
    if (controlledFlipped === undefined) return
    setSpins((s) => (s % 2 === 1) === controlledFlipped ? s : s + 1)
  }, [controlledFlipped])

  function toggle(next: boolean) {
    if (next === flipped) return
    setSpins((s) => s + 1)
    onFlipChange?.(next)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full [perspective:1800px]">
        <div
          className="relative w-full cursor-pointer transition-transform duration-700 [transform-style:preserve-3d] [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]"
          style={{ transform: `rotateY(${spins * 180}deg)` }}
          onClick={() => toggle(!flipped)}
        >
          <div className="[backface-visibility:hidden]">
            <IdCard {...cardProps} />
          </div>
          <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <IdCardBack />
          </div>
        </div>
      </div>

      {!hideToggle && (
        <div className="flex items-center gap-1 rounded-full bg-surface p-1 shadow-card">
          <button
            onClick={() => toggle(false)}
            className={`rounded-full px-4 py-1.5 font-heading text-[12px] font-extrabold uppercase tracking-wide transition-colors ${
              !flipped ? 'bg-ink-deep text-white' : 'text-slate'
            }`}
          >
            Front
          </button>
          <button
            onClick={() => toggle(true)}
            className={`rounded-full px-4 py-1.5 font-heading text-[12px] font-extrabold uppercase tracking-wide transition-colors ${
              flipped ? 'bg-ink-deep text-white' : 'text-slate'
            }`}
          >
            Back
          </button>
        </div>
      )}
    </div>
  )
}
