import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { useAuth } from '../auth/AuthContext'
import { getInitials } from '../utils/initials'

const RESPONSIBILITIES = [
  'Mark attendance each service — search a member and tap to check them in; every tick saves instantly.',
  'Use the “Newest” filter to quickly find members added in the last week.',
  'Add a new member if someone joins — tap “Add Member” and fill the short form.',
  'Review earlier services anytime under “Attendance History”.',
  'Keep your sign-in private, and sign out when you finish on a shared device.',
  'You only ever see attendance and add-member — everything else stays with the church admin.',
]

/**
 * The attendance taker's own profile — name, email and role, plus what the
 * role involves. Opened from "View Profile" in the taker header.
 */
export function TakerProfileScreen() {
  const navigate = useNavigate()
  const { takerName, takerEmail } = useAuth()
  const name = takerName || 'Friend'
  const [open, setOpen] = useState(true)

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="My Profile" onBack={() => navigate('/attendance')} />

      <Card className="mb-5 flex flex-col items-center p-6 text-center">
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep font-display text-[26px] font-bold text-white">
          {getInitials(name)}
        </div>
        <h2 className="font-display text-[18px] font-bold text-heading">{name}</h2>
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-ink-deep px-3 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white">
          <Icon name="shield" className="icon !h-[11px] !w-[11px] text-brass" />
          Attendance Taker
        </span>
      </Card>

      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wide text-slate">Account</div>
      <Card className="mb-6">
        <Row label="Name" value={name} />
        <Row label="Email" value={takerEmail || '—'} last />
      </Card>

      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wide text-slate">
        Your role &amp; responsibilities
      </div>
      <Card className="mb-2 p-4">
        {open && (
          <ul className="space-y-2.5">
            {RESPONSIBILITIES.map((p, i) => (
              <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-charcoal">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
                <span className="min-w-0">{p}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-2 flex items-center gap-1 text-[11.5px] font-bold text-brass-deep"
        >
          {open ? 'Show less' : 'Read more'}
          <Icon
            name="chevron"
            className={`icon !h-[11px] !w-[11px] transition-transform ${open ? '-rotate-90' : 'rotate-90'}`}
          />
        </button>
      </Card>
    </div>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-3.5 py-3 ${last ? '' : 'border-b border-hairline'}`}>
      <span className="shrink-0 text-[12px] text-slate">{label}</span>
      <span className="truncate text-right text-[12.5px] font-semibold text-heading">{value}</span>
    </div>
  )
}
