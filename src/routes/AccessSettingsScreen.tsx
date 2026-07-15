import { useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { StatusPill } from '../components/ui/StatusPill'

const TAKERS = [
  { id: '1', email: 'volunteer.priya@mail.com', grantedOn: '02 Jun 2026', active: true },
]

export function AccessSettingsScreen() {
  const [email, setEmail] = useState('')

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-[20px] font-bold text-heading">Access Settings</h1>
        <p className="mt-1 text-[12.5px] text-slate">
          Grant or revoke the Attendance Taker role by email — they'll only ever see the Sunday
          attendance screen, nothing else.
        </p>
      </div>

      <Card className="mb-5 p-3.5">
        <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-slate">
          Grant access
        </div>
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className="flex-1 rounded-xl border border-hairline bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-slate"
          />
          <button className="rounded-xl bg-ink px-4 py-2 text-[12.5px] font-bold text-white">
            Grant
          </button>
        </div>
      </Card>

      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wide text-slate">
        Attendance Takers
      </div>
      <Card>
        {TAKERS.map((taker, i) => (
          <div
            key={taker.id}
            className={`flex items-center gap-3 px-3.5 py-3 ${
              i < TAKERS.length - 1 ? 'border-b border-hairline' : ''
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-paper-2">
              <Icon name="shield" className="icon !h-[15px] !w-[15px] text-heading" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold text-charcoal">
                {taker.email}
              </div>
              <div className="font-mono text-[10.5px] text-slate">
                Granted {taker.grantedOn}
              </div>
            </div>
            <StatusPill status="regular" label="Active" size="sm" />
            <button className="text-[11.5px] font-bold text-status-alert-fg">Revoke</button>
          </div>
        ))}
      </Card>
    </div>
  )
}
