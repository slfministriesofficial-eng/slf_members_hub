import { Icon } from '../../components/ui/Icon'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import type { Member } from '../../mock/types'

export type MemberCardType = 'birthday' | 'anniversary' | 'new-member'

type MemberCardProps = {
  member: Member
  type: MemberCardType
  dateLabel: string
  dateValue: string
  subLabel?: string
  // Anniversary only — shows "<name> & <spouse>" in the title instead of just <name>.
  coupleName?: string
  // Quick-glance relative-time badge — "In 2 Days", "September", "3 Days Ago", etc.
  countdownLabel?: string
  // True once a wish/welcome message has been sent this visit — takes over
  // the badge slot from countdownLabel, since "done" matters more at that point.
  completed?: boolean
  onView: () => void
  onSend?: () => void
  sendLabel?: string
}

// The one reusable card used by every celebration list (birthdays,
// anniversaries, new members) — only the data and the optional action button
// change per type, never the layout, per the "one card design" requirement.
export function MemberCard({
  member,
  dateLabel,
  dateValue,
  subLabel,
  coupleName,
  countdownLabel,
  completed = false,
  onView,
  onSend,
  sendLabel,
}: MemberCardProps) {
  const isImminent = countdownLabel === 'Today' || countdownLabel === 'Tomorrow'
  return (
    <Card className="motion-safe:animate-[fade-rise_0.3s_ease-out_both] p-4 transition-shadow hover:shadow-elev">
      <div className="flex items-start gap-3">
        <Avatar initials={member.initials} color={member.color} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="truncate text-[13.5px] font-bold text-heading">
              {member.name}
              {coupleName && <span className="font-normal text-slate"> &amp; {coupleName}</span>}
            </div>
            {completed ? (
              <span className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-status-regular-bg px-2.5 py-1 text-[10px] font-bold text-status-regular-fg">
                <Icon name="check" className="icon !h-[10px] !w-[10px]" />
                Completed
              </span>
            ) : (
              countdownLabel && (
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    isImminent ? 'bg-status-alert-bg text-status-alert-fg' : 'bg-paper-2 text-slate'
                  }`}
                >
                  {countdownLabel}
                </span>
              )
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] text-slate">
            <span>{member.memberId}</span>
            {subLabel && (
              <>
                <span className="h-1 w-1 rounded-full bg-faint" />
                <span className="font-body">{subLabel}</span>
              </>
            )}
          </div>
          <div className="mt-1 text-[11px] text-charcoal">
            {dateLabel}: <span className="font-semibold text-heading">{dateValue}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {member.ministry !== '—' && (
              <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate">
                {member.ministry}
              </span>
            )}
            {member.phone && (
              <span className="flex items-center gap-1 text-[10.5px] text-slate">
                <Icon name="phone" className="icon !h-[10px] !w-[10px]" />
                {member.phone}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onView}
          className="flex-1 rounded-xl border border-hairline bg-surface py-2.5 text-[12px] font-bold text-heading transition-colors hover:bg-paper"
        >
          View Profile
        </button>
        {onSend && sendLabel && (
          <button
            onClick={onSend}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-[#1FAF57]"
          >
            <Icon name="chat" className="icon !h-[13px] !w-[13px]" />
            {sendLabel}
          </button>
        )}
      </div>
    </Card>
  )
}
