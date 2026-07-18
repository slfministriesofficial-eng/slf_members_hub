import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { CountBadge } from '../components/ui/CountBadge'
import { Skeleton } from '../components/ui/Skeleton'
import { useAlertCounts } from '../hooks/useAlertCounts'
import {
  cleanTitle,
  findNextTrigger,
  KIND_META,
  NextNotificationCard,
  useNotificationHistory,
  useTokenCount,
  useUpcomingSchedule,
} from '../notifications/scheduleView'
import { useMemberNotificationStatuses } from '../notifications/NotificationStatusBell'
import { useNotificationSettings } from '../notifications/useNotificationSettings'
import { SkeletonActivityRow, SkeletonStatCard, SkeletonUpcomingCard } from '../components/ui/Skeleton'
import { DASHBOARD_STATS } from '../mock/data'
import { ADMIN_ROLE, useAuth } from '../auth/AuthContext'
import { useMembers } from '../features/members/MembersContext'
import { getInitials } from '../utils/initials'
import { getFormattedDate } from '../utils/date'
import { getUpcomingDates } from '../utils/upcomingDates'
import { getRecentActivity } from '../utils/recentActivity'
import { getCompletedIds } from '../utils/completedWishes'

const QUICK_ACTIONS = [
  { icon: 'cal-check', label: 'Attendance', to: '/attendance' },
  { icon: 'plus', label: 'Add Member', to: '/members/new' },
  { icon: 'flag', label: 'Follow-ups', accent: true, to: '/follow-ups' },
  { icon: 'cake', label: 'Birthdays', to: '/birthdays' },
  { icon: 'megaphone', label: 'Announcements', accent: true, to: '/announcements' },
  { icon: 'chart', label: 'Reports', to: '/reports' },
  { icon: 'users', label: 'Members', to: '/members' },
  { icon: 'id', label: 'ID Cards', to: '/membership-cards' },
]

/** How many history rows the dashboard card shows. */
const HISTORY_PREVIEW_LIMIT = 6

/** Icon/label for a history row's kind — falls back for kinds KIND_META lacks. */
function historyMeta(kind: string): { icon: string; accent: string; label: string } {
  if (kind in KIND_META) return KIND_META[kind as keyof typeof KIND_META]
  if (kind === 'announcement') return { icon: 'megaphone', accent: 'text-brass-deep', label: 'Announcement' }
  if (kind === 'visitor-welcome') return { icon: 'heart', accent: 'text-brass-deep', label: 'Welcome' }
  return { icon: 'bell', accent: 'text-heading', label: 'Notification' }
}

/** "Today · 6:32 PM" for same-day sends, "15 Jul · 8:00 AM" otherwise. */
function historyTimeLabel(iso: string, now: Date): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Today · ${time}`
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ` · ${time}`
}

export function HomeScreen() {
  const { adminName } = useAuth()
  const navigate = useNavigate()
  const name = adminName || 'Admin'
  const { members, isLoading, isError } = useMembers()
  const alertCounts = useAlertCounts()

  // Next-notification hero — same shared card as the Follow-ups page, with
  // "Reaches N devices" and "Pending N members" (not yet enabled) chips.
  // Shared cached query: flipping a switch on the Access page invalidates it,
  // so this hero updates immediately instead of after the 5-minute staleTime.
  const { data: schedule, isError: scheduleFailed } = useUpcomingSchedule()
  const now = useMemo(() => new Date(), [])
  const { data: deviceCount } = useTokenCount()
  const { data: notificationStatuses } = useMemberNotificationStatuses()
  const { data: notificationSettings } = useNotificationSettings()
  // This month's completed sends; hidden entirely when the endpoint is
  // unavailable (old Apps Script deployment) so the dashboard never breaks.
  const { data: sendHistory } = useNotificationHistory()

  const nextTrigger = schedule ? findNextTrigger(schedule, now) : null
  const pendingMemberCount =
    notificationStatuses && !isLoading && !isError
      ? members.filter((m) => !notificationStatuses[m.memberId]).length
      : null

  // Dashboard quick-action badges — Birthdays shows the WEEK's pending
  // celebrations (per spec); Follow-ups shows welcomes still owed today.
  function quickActionBadge(to?: string): number {
    if (to === '/birthdays') return alertCounts.celebrationsWeek
    if (to === '/follow-ups') return alertCounts.followUpsPending
    if (to === '/members') return alertCounts.newMembers
    return 0
  }

  const ministryCount = useMemo(
    () => new Set(members.flatMap((m) => m.ministryInterests ?? [])).size,
    [members],
  )
  const upcoming = useMemo(() => getUpcomingDates(members), [members])
  const recentActivity = useMemo(() => getRecentActivity(members), [members])
  const birthdaysThisWeek = upcoming.filter((u) => u.what === 'Birthday').length

  // "Wish sent" ticks on the This-week cards. Wishes are marked completed by
  // the member's internal id (SendWishScreen), while the cards carry the
  // SLF-xxxx memberId — so map one to the other. Refreshes live when a wish
  // is sent anywhere (the 'slf-alerts-changed' event completedWishes fires).
  const [completedWishIds, setCompletedWishIds] = useState<Set<string>>(getCompletedIds)
  useEffect(() => {
    const refresh = () => setCompletedWishIds(getCompletedIds())
    window.addEventListener('slf-alerts-changed', refresh)
    return () => window.removeEventListener('slf-alerts-changed', refresh)
  }, [])
  const memberIdToInternalId = useMemo(() => {
    const map = new Map<string, string>()
    members.forEach((m) => map.set(m.memberId, m.id))
    return map
  }, [members])
  function isWishSent(memberId: string): boolean {
    const internalId = memberIdToInternalId.get(memberId)
    return internalId ? completedWishIds.has(internalId) : false
  }

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

      {/* Next-notification hero — the shared Follow-ups card, replacing the old
          mock "Needs attention" card with real automation data. Tapping it opens
          the full schedule. Hidden quietly if the schedule endpoint is unreachable. */}
      {!scheduleFailed && (
        <div
          className="mb-5 -mx-2 cursor-pointer md:mx-0"
          onClick={() => navigate('/follow-ups/schedule')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') navigate('/follow-ups/schedule')
          }}
        >
          {nextTrigger ? (
            <NextNotificationCard
              trigger={nextTrigger}
              now={now}
              deviceCount={deviceCount ?? null}
              pendingCount={pendingMemberCount}
              paused={notificationSettings ? !notificationSettings.enabled : false}
            />
          ) : (
            <Skeleton className="h-28 w-full rounded-2xl" />
          )}
        </div>
      )}

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
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-paper-2">
              <Icon
                name={action.icon}
                className={`icon !h-[18px] !w-[18px] ${action.accent ? 'text-brass-deep' : 'text-heading'}`}
              />
              <CountBadge count={quickActionBadge(action.to)} className="absolute -right-1.5 -top-1.5" />
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
              {upcoming.map((item) => {
                const wishSent = isWishSent(item.memberId)
                return (
                  <div
                    key={item.id}
                    className="relative w-[118px] shrink-0 rounded-2xl bg-surface p-3 text-center md:flex md:w-full md:items-center md:gap-3 md:p-3 md:text-left"
                  >
                    {/* Green tick once a wish has been sent to this member — so
                        the admin can see at a glance who's already been wished. */}
                    {wishSent && (
                      <span
                        title="Wish sent"
                        className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-status-regular-fg md:static md:order-3 md:h-5 md:w-5"
                      >
                        <Icon name="check" className="icon !h-[10px] !w-[10px] text-white md:!h-[12px] md:!w-[12px]" />
                      </span>
                    )}
                    <div className="md:w-11 md:shrink-0 md:text-center">
                      <div className="text-[10px] font-bold uppercase text-brass-deep font-mono">
                        {item.month}
                      </div>
                      <div className="font-display text-[19px] font-bold text-heading">{item.day}</div>
                    </div>
                    <div className="mt-1.5 md:mt-0 md:min-w-0 md:flex-1">
                      <div className="truncate text-[11px] font-semibold leading-tight text-charcoal">
                        {item.who}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[9.5px] text-slate">{item.memberId}</div>
                      <div className="mt-0.5 text-[10px] text-slate">
                        {item.what}
                        {wishSent && <span className="ml-1 font-semibold text-status-regular-fg">· Wished</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          {/* NOTIFICATIONS SENT — this month's delivered pushes with a tick +
              reached-device count. The backing sheet keeps only the current
              month, so this list resets naturally on the 1st. */}
          {sendHistory && (
            <>
              <div className="mb-3 mt-6 flex items-baseline justify-between">
                <h2 className="font-display text-[15.5px] font-bold text-heading">Notifications sent</h2>
                <span className="text-[11px] font-semibold text-slate">
                  This month · {sendHistory.length}
                </span>
              </div>
              {sendHistory.length === 0 ? (
                <p className="mb-2 text-[12px] text-slate">Nothing sent yet this month.</p>
              ) : (
                <Card className="mb-2">
                  {sendHistory.slice(0, HISTORY_PREVIEW_LIMIT).map((item, i) => {
                    const meta = historyMeta(item.kind)
                    return (
                      <div
                        key={`${item.sentAt}-${i}`}
                        className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-2.5 last:border-b-0"
                      >
                        <Icon name={meta.icon} className={`icon !h-[14px] !w-[14px] shrink-0 ${meta.accent}`} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12px] font-semibold text-heading">
                            {cleanTitle(item.title) || meta.label}
                          </div>
                          <div className="mt-0.5 font-mono text-[10px] text-slate">
                            {historyTimeLabel(item.sentAt, now)}
                            {item.failed > 0 && (
                              <span className="ml-1.5 font-sans font-semibold text-status-alert-fg">
                                {item.failed} failed
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-status-regular-bg px-2 py-1 text-[10.5px] font-bold text-status-regular-fg">
                          <Icon name="check" className="icon !h-[10px] !w-[10px]" />
                          {item.sent} device{item.sent === 1 ? '' : 's'}
                        </span>
                      </div>
                    )
                  })}
                </Card>
              )}
            </>
          )}

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
