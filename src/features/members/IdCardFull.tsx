import { useEffect, useRef, useState } from 'react'
import type { MemberStatus } from '../../components/ui/StatusPill'
import { IdCard } from './IdCard'
import { IdCardBack } from './IdCardBack'

// The card's internal layout is authored at this fixed size (8:5, a standard
// ID-card ratio). Every screen renders it at exactly this size, then scales the
// WHOLE card uniformly to fit its container — so the inside content (fonts,
// spacing, logo, QR) is pixel-identical on every page and prints the same for
// every member. The base is intentionally wide so the fixed-size content always
// fits the 8:5 box (no clipped bottom band). Front and back are the same size.
const BASE_WIDTH = 500
const BASE_HEIGHT = (BASE_WIDTH * 5) / 8 // 8:5

type IdCardFullProps = {
  name: string
  memberId: string
  mobile?: string
  bloodGroup?: string
  status: MemberStatus
  statusLabel: string
  sinceYear?: string
  // Public digital profile only — hides the phone number (never shown publicly).
  hideMobile?: boolean
}

/**
 * The membership card with a FRONT/BACK flip, used identically on every page
 * (ID Card Preview, Member Profile, Public Profile, Membership Cards). The card
 * is drawn at one fixed design size and scaled to fit, so both faces are the
 * same size and the layout is consistent and print-ready everywhere.
 */
export function IdCardFull({ hideMobile, ...front }: IdCardFullProps) {
  // Spins forward on every toggle so the card never snaps backward; flipped is
  // just the parity of the spin count.
  const [spins, setSpins] = useState(0)
  const flipped = spins % 2 === 1

  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setScale(Math.min(1, el.clientWidth / BASE_WIDTH))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  function toggle(target: boolean) {
    if (target === flipped) return
    setSpins((s) => s + 1)
  }

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-4">
      {/* Reserves the scaled height (8:5) so the flip sits in normal flow. */}
      <div ref={boxRef} className="w-full overflow-hidden" style={{ aspectRatio: '8 / 5' }}>
        <div
          style={{
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            perspective: '1800px',
          }}
        >
          <div
            className="relative h-full w-full cursor-pointer [transform-style:preserve-3d]"
            style={{
              transform: `rotateY(${spins * 180}deg)`,
              transition: 'transform 700ms cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onClick={() => toggle(!flipped)}
          >
            <div className="absolute inset-0 [backface-visibility:hidden]">
              <IdCard {...front} hideMobile={hideMobile} />
            </div>
            <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
              <IdCardBack />
            </div>
          </div>
        </div>
      </div>

      {/* Front / Back toggle */}
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
    </div>
  )
}
