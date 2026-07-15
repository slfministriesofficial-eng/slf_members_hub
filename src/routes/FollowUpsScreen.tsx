import { IconButton } from '../components/ui/IconButton'
import { StatusPill } from '../components/ui/StatusPill'
import { CARE_ITEMS } from '../mock/data'

export function FollowUpsScreen() {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <h1 className="font-display text-[20px] font-bold text-heading">Follow-ups</h1>
        <IconButton icon="bell" />
      </div>

      <div>
        {CARE_ITEMS.map((item) => (
          <div key={item.id} className="mb-2.5 rounded-2xl bg-surface p-3.5 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-bold text-heading">{item.who}</span>
              <StatusPill status={item.tagStatus} label={item.tagLabel} size="sm" />
            </div>
            <p className="mb-2.5 text-[12px] leading-relaxed text-charcoal">{item.note}</p>
            <div className="flex items-center justify-between">
              <span
                className={`font-mono text-[11px] ${
                  item.isDueToday ? 'font-bold text-status-alert-fg' : 'text-slate'
                }`}
              >
                {item.due}
              </span>
              <button
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  item.isDueToday ? 'bg-ink text-white' : 'border border-hairline text-heading'
                }`}
              >
                Log contact
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
