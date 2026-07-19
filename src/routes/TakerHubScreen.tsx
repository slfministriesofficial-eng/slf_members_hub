import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { useMembers } from '../features/members/MembersContext'
import { getAttendanceMarks } from '../utils/attendanceMarks'

function formatFullDate(date: Date): string {
  return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'long' })} ${date.getFullYear()}`
}

/**
 * The attendance taker's home — the same three-card hub design as the admin's
 * Attendance hub, scoped to what a taker can do: mark attendance, review
 * history, and add a member. Works identically on mobile and desktop.
 */
export function TakerHubScreen() {
  const navigate = useNavigate()
  const { members, isLoading } = useMembers()
  const [marks] = useState(getAttendanceMarks)
  const now = useMemo(() => new Date(), [])

  const total = isLoading ? 0 : members.length
  const presentToday = members.reduce((n, m) => (marks[m.id] ? n + 1 : n), 0)

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-6">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">Attendance</h1>
        <span className="shrink-0 text-[11.5px] font-semibold text-slate">{formatFullDate(now)}</span>
      </div>
      <p className="mb-5 text-[12.5px] text-slate">Mark today's service, review past records, or add a member.</p>

      <div className="grid gap-3 md:grid-cols-3">
        <ActionCard
          icon="users"
          iconBg="bg-gradient-to-br from-ink to-ink-deep"
          buttonBg="bg-ink hover:bg-ink-deep"
          title="Mark Attendance"
          description="Open the member list and check everyone in."
          meta={isLoading ? 'Loading members…' : `${presentToday} of ${total} present today`}
          metaIcon="check"
          onClick={() => navigate('/attendance/all')}
        />
        <ActionCard
          icon="clock"
          iconBg="bg-gradient-to-br from-tint-green-fg to-[#1E7A54]"
          buttonBg="bg-tint-green-fg hover:brightness-110"
          title="Attendance History"
          description="Review past services and who was present."
          meta="Last two months"
          metaIcon="cal-check"
          onClick={() => navigate('/attendance/history')}
        />
        <ActionCard
          icon="plus"
          iconBg="bg-gradient-to-br from-brass to-brass-deep"
          buttonBg="bg-brass-deep hover:brightness-110"
          title="Add Member"
          description="Register a new member into the church roll."
          meta="Opens the registration form"
          metaIcon="user"
          onClick={() => navigate('/members/new')}
        />
      </div>

      <RoleCard />
    </div>
  )
}

/** What an attendance taker does — a short summary that expands with Read more. */
function RoleCard() {
  const [open, setOpen] = useState(false)
  const points = [
    'Mark attendance each service — open “Mark Attendance”, search a member and tap to check them in. Every tick saves instantly.',
    'Use the “Newest” filter to quickly find members added in the last week.',
    'Add a new member if someone joins — tap “Add Member” and fill the short form.',
    'Review earlier services anytime under “Attendance History”.',
    'Your sign-in link is personal — please don’t share it, and sign out when you finish on a shared device.',
    'You only ever see attendance and add-member — everything else stays with the church admin.',
  ]
  return (
    <div className="mt-5 rounded-2xl bg-surface p-4 shadow-card md:mt-6 md:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brass to-brass-deep">
          <Icon name="shield" className="icon !h-[19px] !w-[19px] text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-heading">Your role &amp; responsibilities</h2>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-slate">
            You help the church by marking who attends each service and welcoming new members. Here's how it
            works.
          </p>

          {open && (
            <ul className="mt-3 space-y-2.5">
              {points.map((p, i) => (
                <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-charcoal">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
                  <span className="min-w-0">{p}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-2.5 flex items-center gap-1 text-[11.5px] font-bold text-brass-deep"
          >
            {open ? 'Show less' : 'Read more'}
            <Icon
              name="chevron"
              className={`icon !h-[11px] !w-[11px] transition-transform ${open ? '-rotate-90' : 'rotate-90'}`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

/** One hub card — same treatment as the admin Attendance / Announcements hubs. */
function ActionCard({
  icon,
  iconBg,
  buttonBg,
  title,
  description,
  meta,
  metaIcon,
  onClick,
}: {
  icon: string
  iconBg: string
  buttonBg: string
  title: string
  description: string
  meta: string
  metaIcon: string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick()
      }}
      className="motion-safe:animate-[fade-rise_0.3s_ease-out_both] flex cursor-pointer flex-col rounded-2xl bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elev md:p-5"
    >
      <div className="flex items-center gap-3.5 md:flex-col md:items-start md:gap-0">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl md:mb-3 ${iconBg}`}>
          <Icon name={icon} className="icon !h-[21px] !w-[21px] text-white" />
        </span>
        <span className="min-w-0 flex-1 md:flex-none">
          <span className="block text-[14.5px] font-bold text-heading">{title}</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-slate">{description}</span>
          <span className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-brass-deep">
            <Icon name={metaIcon} className="icon !h-[11px] !w-[11px]" />
            {meta}
          </span>
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={`mt-3.5 w-full rounded-full py-2.5 text-[12px] font-bold text-white transition-transform hover:scale-[1.02] ${buttonBg}`}
      >
        {title}
      </button>
    </div>
  )
}
