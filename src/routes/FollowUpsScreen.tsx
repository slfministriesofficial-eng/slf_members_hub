import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { MemberCard } from '../features/members/MemberCard'
import { deriveNewMembers, formatPastLabel, dateParts, isSameCalendarMonth } from '../utils/celebrations'
import { getCompletedIds } from '../utils/completedWishes'
import { fetchUpcomingSchedule, type UpcomingSchedule } from '../notifications/api'
import { findNextTrigger, NextNotificationCard, ScheduleEventRow, useTokenCount } from '../notifications/scheduleView'
import { useNotificationSettings } from '../notifications/useNotificationSettings'
import { markFollowUpsSeen } from '../hooks/useAlertCounts'
import type { Member } from '../mock/types'

/** How many upcoming triggers the dashboard previews before "View All". */
const SCHEDULE_PREVIEW_LIMIT = 5

type FilterKey = 'all' | 'today' | 'week' | 'month' | 'completed'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'completed', label: 'Completed' },
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function matchesSearch(member: Member, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return member.name.toLowerCase().includes(q) || normalize(member.memberId).includes(normalize(query))
}

export function FollowUpsScreen() {
  const navigate = useNavigate()
  const { members, isLoading, isError } = useMembers()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [completedIds] = useState<Set<string>>(getCompletedIds)
  const [schedule, setSchedule] = useState<UpcomingSchedule | null>(null)
  const [scheduleError, setScheduleError] = useState(false)

  const now = useMemo(() => new Date(), [])
  const newMembers = useMemo(() => deriveNewMembers(members), [members])

  // Opening this page counts as "seeing" the pending welcomes — clears the
  // Follow-ups badge until a new member appears.
  useEffect(() => {
    if (isLoading || isError) return
    markFollowUpsSeen(newMembers.map((e) => e.member.id))
  }, [isLoading, isError, newMembers])

  useEffect(() => {
    let cancelled = false
    fetchUpcomingSchedule()
      .then((data) => {
        if (!cancelled) setSchedule(data)
      })
      .catch(() => {
        if (!cancelled) setScheduleError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const nextTrigger = schedule ? findNextTrigger(schedule, now) : null
  const previewEvents = schedule ? schedule.events.slice(0, SCHEDULE_PREVIEW_LIMIT) : []
  const { data: deviceCount } = useTokenCount()
  const { data: settings } = useNotificationSettings()
  const automationPaused = settings ? !settings.enabled : false

  // Once welcomed, someone drops off every filter except "Completed" itself.
  const filteredNewMembers = useMemo(() => {
    return newMembers.filter((e) => matchesSearch(e.member, query)).filter((e) => {
      if (filter === 'completed') return completedIds.has(e.member.id)
      if (completedIds.has(e.member.id)) return false
      switch (filter) {
        case 'today':
          return e.daysAgo === 0
        case 'week':
          return e.daysAgo <= 7
        case 'month':
          return isSameCalendarMonth(e.joinedDate, now)
        default:
          return true
      }
    })
  }, [newMembers, query, filter, now, completedIds])

  return (
    <div>
      {/* Title + the page's own Schedule button share the top row — same
          alignment pattern as the Members and Attendance pages. */}
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="font-display text-[20px] font-bold text-heading md:text-[26px]">Follow-ups</h1>
        <button onClick={() => navigate('/follow-ups/schedule')} className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep shadow-card">
            <Icon name="cal-check" className="icon !h-[16px] !w-[16px] text-white" />
          </span>
          <span className="text-[12px] font-bold text-brass-deep">Schedule</span>
        </button>
      </div>
      <p className="mb-4 overflow-hidden whitespace-nowrap text-[10px] text-slate md:text-[12.5px]">
        Stay ahead of what's coming for your members.
      </p>

      {/* NEXT NOTIFICATION + UPCOMING PREVIEW — real automation data replacing
          the old mock pastoral-care placeholders. */}
      {!scheduleError && !schedule && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      )}

      {!scheduleError && schedule && (
        <>
          {nextTrigger && (
            <NextNotificationCard
              trigger={nextTrigger}
              now={now}
              deviceCount={deviceCount ?? null}
              paused={automationPaused}
            />
          )}

          {/* Notification on/off switches live on the Access Settings page —
              this is just the signpost (plus the paused warning when off). */}
          {settings && (
            <button
              onClick={() => navigate('/access')}
              className="mt-3 flex w-full items-center gap-2.5 rounded-2xl bg-surface px-4 py-3 text-left shadow-card transition-colors hover:bg-paper"
            >
              <Icon
                name={settings.enabled ? 'bell' : 'bell-off'}
                className={`icon !h-[15px] !w-[15px] shrink-0 ${
                  settings.enabled ? 'text-status-regular-fg' : 'text-status-alert-fg'
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold text-heading">Notification Access</span>
                <span className="block text-[11px] text-slate">
                  {settings.enabled
                    ? settings.disabled.length > 0
                      ? `${settings.disabled.length} of 18 notifications switched off`
                      : 'All notifications active — switch any on or off'
                    : 'All notifications deactivated'}
                </span>
              </span>
              <Icon name="chevron" className="icon !h-[13px] !w-[13px] shrink-0 text-slate" />
            </button>
          )}

          <div className="mb-2 mt-5 flex items-center justify-between">
            <h2 className="font-display text-[15px] font-bold text-heading">
              Upcoming This Month ({schedule.events.length})
            </h2>
            <button
              onClick={() => navigate('/follow-ups/schedule')}
              className="rounded-full border border-brass-deep px-3.5 py-1.5 text-[11.5px] font-bold text-brass-deep transition-colors hover:bg-brass/10"
            >
              View All
            </button>
          </div>

          {previewEvents.length === 0 ? (
            <Card className="p-5 text-center">
              <p className="text-[12.5px] text-slate">
                No dated notifications left this month — daily prayer reminders continue every evening.
              </p>
            </Card>
          ) : (
            <Card>
              {previewEvents.map((event, i) => (
                <ScheduleEventRow
                  key={`${event.kind}-${event.date}-${event.time}-${event.memberId ?? i}`}
                  event={event}
                  showDay
                  now={now}
                />
              ))}
            </Card>
          )}
        </>
      )}

      {scheduleError && (
        <Card className="p-5 text-center">
          <p className="text-[12.5px] text-slate">
            Could not load the notification schedule — make sure the latest Apps Script version is deployed.
          </p>
        </Card>
      )}

      {/* NEW MEMBER WELCOME */}
      <section className="mt-8 motion-safe:animate-[fade-rise_0.4s_ease-out_both]">
        <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-heading">
          <Icon name="heart" className="icon !h-[15px] !w-[15px] text-brass-deep" />
          New Members
        </h2>
        <p className="mb-4 text-[12.5px] text-slate">Welcome newly registered members with a personal message.</p>

        {isError && (
          <p className="py-6 text-center text-[13px] text-slate">Could not load members — check your connection.</p>
        )}

        {!isError && isLoading && <Skeleton className="h-16 w-full rounded-2xl" />}

        {!isError && !isLoading && (
          <>
            <div className="relative mb-3">
              <Icon
                name="search"
                className="icon !h-[14px] !w-[14px] pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or member ID…"
                className="w-full rounded-full border border-hairline bg-surface py-3 pl-10 pr-4 text-[13px] text-heading outline-none placeholder:text-slate focus:border-ink"
              />
            </div>

            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
                    filter === f.key ? 'bg-ink-deep text-white' : 'bg-surface text-heading shadow-card hover:bg-paper'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredNewMembers.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-[12.5px] text-slate">No new members to show.</p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredNewMembers.map((e) => {
                  const { day, month } = dateParts(e.joinedDate)
                  return (
                    <MemberCard
                      key={e.member.id}
                      member={e.member}
                      type="new-member"
                      dateDay={day}
                      dateMonth={month}
                      countdownLabel={formatPastLabel(e.joinedDate, now)}
                      completed={completedIds.has(e.member.id)}
                      onView={() => navigate(`/celebration-profile/new-member/${e.member.id}`)}
                      onSend={() => navigate(`/send-wish/welcome/${e.member.id}`)}
                      sendLabel="Send Wishes"
                    />
                  )
                })}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
