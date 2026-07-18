import { Icon } from '../../components/ui/Icon'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { NotificationStatusBell } from '../../notifications/NotificationStatusBell'
import type { Member } from '../../mock/types'

export type MemberCardType = 'birthday' | 'anniversary' | 'baptism' | 'membership' | 'new-member'

// Birthday = amber, Anniversary = pink, Baptism = blue, Membership = purple —
// the same five-color coding used on the dashboard's This-week labels. The
// Send Wish button stays WhatsApp green everywhere instead, since that's
// about the channel it opens, not the occasion.
const ACCENT_ICON: Record<MemberCardType, string> = {
  birthday: 'text-tint-amber-fg',
  anniversary: 'text-tint-pink-fg',
  baptism: 'text-tint-blue-fg',
  membership: 'text-tint-purple-fg',
  'new-member': 'text-brass-deep',
}

type MemberCardProps = {
  member: Member
  type: MemberCardType
  dateDay: string
  dateMonth: string
  subLabel?: string
  // Anniversary only — shows "<name> & <spouse>" in the title instead of just <name>.
  coupleName?: string
  // Quick-glance relative-time caption under the date box — "In 2 Days", "September", "3 Days Ago", etc.
  countdownLabel?: string
  // True once a wish/welcome message has been sent this visit — takes over
  // the caption slot from countdownLabel, since "done" matters more at that point.
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
  type,
  dateDay,
  dateMonth,
  subLabel,
  coupleName,
  countdownLabel,
  completed = false,
  onView,
  onSend,
  sendLabel,
}: MemberCardProps) {
  return (
    <Card className="motion-safe:animate-[fade-rise_0.3s_ease-out_both] p-4 transition-shadow hover:shadow-elev">
      <div className="flex items-start gap-3">
        <Avatar initials={member.initials} color={member.color} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13.5px] font-bold text-heading">
              {member.name}
              {coupleName && <span className="font-normal text-slate"> &amp; {coupleName}</span>}
            </span>
            <NotificationStatusBell memberId={member.memberId} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px]">
            <span className="font-mono text-slate">{member.memberId}</span>
            {subLabel && (
              <>
                <span className="h-1 w-1 rounded-full bg-faint" />
                <span className="text-slate">{subLabel}</span>
              </>
            )}
            {member.ministry !== '—' && (
              <>
                <span className="h-1 w-1 rounded-full bg-faint" />
                <span className={`font-semibold ${ACCENT_ICON[type]}`}>{member.ministry}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className="flex w-12 flex-col items-center rounded-xl border border-hairline bg-paper px-1.5 py-1.5">
            <span className="font-display text-[15px] font-bold leading-none text-heading">{dateDay}</span>
            <span className="mt-0.5 text-[8.5px] font-bold uppercase tracking-wide text-slate">{dateMonth}</span>
          </div>
          {completed ? (
            <span className="flex items-center gap-0.5 whitespace-nowrap text-[9px] font-bold text-status-regular-fg">
              <Icon name="check" className="icon !h-[9px] !w-[9px]" />
              Completed
            </span>
          ) : (
            countdownLabel && <span className="whitespace-nowrap text-[9px] font-semibold text-slate">{countdownLabel}</span>
          )}
        </div>
      </div>

      {(member.phone || member.whatsapp) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-charcoal">
          {member.phone && (
            <span className="flex items-center gap-1.5">
              <Icon name="phone" className="icon !h-[11px] !w-[11px] text-slate" />
              {member.phone}
            </span>
          )}
          {member.whatsapp && member.whatsapp !== member.phone && (
            <span className="flex items-center gap-1.5">
              <Icon name="whatsapp" className="icon !h-[11px] !w-[11px] text-[#25D366]" />
              {member.whatsapp}
            </span>
          )}
        </div>
      )}

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
            <Icon name="whatsapp" className="icon !h-[13px] !w-[13px]" />
            {sendLabel}
          </button>
        )}
      </div>
    </Card>
  )
}
