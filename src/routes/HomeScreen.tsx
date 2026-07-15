import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { IconButton } from '../components/ui/IconButton'
import { Card } from '../components/ui/Card'
import { SkeletonActivityRow, SkeletonStatCard, SkeletonUpcomingCard } from '../components/ui/Skeleton'
import { DASHBOARD_STATS } from '../mock/data'
import { ADMIN_ROLE, useAuth } from '../auth/AuthContext'
import { useMembers } from '../features/members/MembersContext'
import { getInitials } from '../utils/initials'
import { getFormattedDate } from '../utils/date'
import { getUpcomingDates } from '../utils/upcomingDates'
import { getRecentActivity } from '../utils/recentActivity'

const QUICK_ACTIONS = [
  { icon: 'cal-check', label: 'Attendance', to: '/attendance' },
  { icon: 'plus', label: 'Add Member', to: '/members/new' },
  { icon: 'flag', label: 'Follow-ups', accent: true, to: '/follow-ups' },
  { icon: 'cake', label: 'Birthdays', to: '/birthdays' },
  { icon: 'megaphone', label: 'Announcements', accent: true, to: '/announcements' },
  { icon: 'chart', label: 'Reports', to: '/reports' },
  { icon: 'download', label: 'Export' },
  { icon: 'cloud', label: 'Backup' },
]

export function HomeScreen() {
  const { adminName } = useAuth()
  const navigate = useNavigate()
  const name = adminName || 'Admin'
  const { members, isLoading, isError } = useMembers()

  const ministryCount = useMemo(
    () => new Set(members.flatMap((m) => m.ministryInterests ?? [])).size,
    [members],
  )
  const upcoming = useMemo(() => getUpcomingDates(members), [members])
  const recentActivity = useMemo(() => getRecentActivity(members), [members])
  const birthdaysThisWeek = upcoming.filter((u) => u.what === 'Birthday').length

  // Follow-ups/absentees have no real backend yet (no attendance log to source them
  // from) — left as mock until that's built, unlike the stats above which are real.
  const stats = [
    { label: 'Total members', value: members.length, tone: 'ink' },
    { label: 'Birthdays this week', value: birthdaysThisWeek, tone: 'regular' },
    { label: 'Follow-ups due', value: DASHBOARD_STATS.followUpsDue, tone: 'ink' },
    { label: 'Absentees flagged', value: DASHBOARD_STATS.absenteesFlagged, tone: 'alert' },
  ]

  return (
    <div>
      {/* Mobile-only header — desktop gets the date + profile via the shared top bar */}
      <div className="mb-4 flex items-center justify-between md:hidden">
        <div className="text-[12px] font-semibold uppercase tracking-wide text-slate font-body">
          {getFormattedDate()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/members/new')}
            className="motion-safe:animate-[gradient-drift_5s_ease_infinite] flex items-center gap-1 rounded-full bg-[length:300%_300%] bg-gradient-to-r from-brass via-[#E4C57E] to-brass-deep px-3 py-2 text-[11px] font-bold text-white shadow-[0_8px_16px_rgba(184,134,58,0.4)]"
          >
            <Icon name="plus" className="icon !h-[13px] !w-[13px] text-white" />
            New Member
          </button>
          <IconButton icon="bell" dot />
        </div>
      </div>

      {/* Premium name card — mobile only; tapping it opens the same profile screen as the top bar menu on desktop */}
      <button
        onClick={() => navigate('/more')}
        className="mb-5 flex w-full items-center justify-between rounded-2xl bg-surface p-4 text-left shadow-card md:hidden"
      >
        <div>
          <div className="text-[12px] text-slate">Hello,</div>
          <div className="font-display text-[19px] font-bold text-heading">{name}</div>
          <div className="mt-0.5 text-[11px] text-slate">{ADMIN_ROLE}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep font-display text-[16px] font-bold text-white">
          {getInitials(name)}
        </div>
      </button>

      {/* Today hero card */}
      <div className="relative mb-5 overflow-hidden rounded-[22px] bg-gradient-to-br from-ink-deep via-ink to-ink-soft p-5 text-white">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-brass/50 blur-2xl" />
        <p className="relative mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[#B9C2DA]">
          Needs attention today
        </p>
        <div className="relative mb-1 font-display text-[28px] font-bold leading-tight">
          3 members flagged
        </div>
        <p className="relative mb-4 text-[12.5px] text-white/70">
          Absent 3 Sundays running — Grace, Joseph &amp; the Fernandez family
        </p>
        <div className="relative flex gap-2">
          <button className="rounded-full bg-brass px-4 py-2 text-[12px] font-bold text-ink-deep">
            Review now
          </button>
          <button className="rounded-full bg-surface/15 px-4 py-2 text-[12px] font-bold text-white">
            Remind me later
          </button>
        </div>
      </div>

      {/* Stats row — desktop only, mobile already gets this via the hero + quick actions */}
      <div className="mb-5 hidden gap-3 md:grid md:grid-cols-4">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : isError ? (
          <Card className="col-span-4 p-3.5">
            <p className="text-[12.5px] text-slate">Could not load stats — check your connection.</p>
          </Card>
        ) : (
          stats.map((stat) => (
            <Card key={stat.label} className="p-3.5">
              <div
                className={`font-display text-[24px] font-bold ${
                  stat.tone === 'alert'
                    ? 'text-status-alert-fg'
                    : stat.tone === 'regular'
                      ? 'text-status-regular-fg'
                      : 'text-heading'
                }`}
              >
                {stat.value}
              </div>
              <div className="mt-0.5 text-[11px] text-slate">{stat.label}</div>
            </Card>
          ))
        )}
      </div>

      {/* Quick actions */}
      <div className="mb-2 grid grid-cols-4 gap-2.5 md:grid-cols-8">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={action.to ? () => navigate(action.to) : undefined}
            className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-1.5 py-3 shadow-card"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper-2">
              <Icon
                name={action.icon}
                className={`icon !h-[18px] !w-[18px] ${action.accent ? 'text-brass-deep' : 'text-heading'}`}
              />
            </div>
            <span className="text-center text-[10px] font-bold leading-tight text-heading font-body">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* This week + Recent activity — stacked on mobile, side by side on desktop */}
      <div className="md:grid md:grid-cols-2 md:items-start md:gap-6">
        <div>
          <div className="mb-3 mt-6 flex items-baseline justify-between md:mt-6">
            <h2 className="font-display text-[15.5px] font-bold text-heading">This week</h2>
            <a href="#" className="text-[12px] font-bold text-brass-deep">
              See all
            </a>
          </div>
          {isLoading ? (
            <div className="-mx-4 mb-2 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:mb-0 md:flex-col md:gap-2.5 md:overflow-visible md:px-0 md:pb-0">
              <SkeletonUpcomingCard />
              <SkeletonUpcomingCard />
              <SkeletonUpcomingCard />
            </div>
          ) : isError ? (
            <p className="text-[12px] text-slate">Could not load — check your connection.</p>
          ) : upcoming.length === 0 ? (
            <p className="text-[12px] text-slate">Nothing coming up this week.</p>
          ) : (
            <div className="-mx-4 mb-2 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:mb-0 md:flex-col md:gap-2.5 md:overflow-visible md:px-0 md:pb-0">
              {upcoming.map((item) => (
                <div
                  key={item.id}
                  className="w-[118px] shrink-0 rounded-2xl bg-surface p-3 text-center shadow-card md:flex md:w-full md:items-center md:gap-3 md:p-3 md:text-left"
                >
                  <div className="md:w-11 md:shrink-0 md:text-center">
                    <div className="text-[10px] font-bold uppercase text-brass-deep font-mono">
                      {item.month}
                    </div>
                    <div className="font-display text-[19px] font-bold text-heading">{item.day}</div>
                  </div>
                  <div className="mt-1.5 md:mt-0 md:flex-1">
                    <div className="text-[11px] font-semibold leading-tight text-charcoal">
                      {item.who}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate">{item.what}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 mt-6 md:mt-6">
            <h2 className="font-display text-[15.5px] font-bold text-heading">Recent activity</h2>
          </div>
          {isLoading ? (
            <Card className="mb-2 px-1 py-1">
              <SkeletonActivityRow />
              <SkeletonActivityRow />
              <SkeletonActivityRow last />
            </Card>
          ) : isError ? (
            <p className="text-[12px] text-slate">Could not load — check your connection.</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-[12px] text-slate">No activity yet.</p>
          ) : (
            <Card className="mb-2 px-1 py-1">
              {recentActivity.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex gap-2.5 px-3 py-2.5 text-[12.5px] ${
                    i < recentActivity.length - 1 ? 'border-b border-hairline' : ''
                  }`}
                >
                  <div className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-brass" />
                  <div>
                    {item.text}
                    <span className="mt-0.5 block font-mono text-[10.5px] text-slate">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <p className="py-4 text-center text-[11.5px] italic text-slate">
        {members.length} members · {ministryCount} ministries · SLF Ministries
      </p>
    </div>
  )
}
