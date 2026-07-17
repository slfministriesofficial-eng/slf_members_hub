import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import type { UpcomingScheduleEvent } from '../notifications/api'
import {
  cleanTitle,
  formatTime12,
  toDateTime,
  dayLabel,
  findNextTrigger,
  LiveBadge,
  NextNotificationCard,
  ScheduleEventRow,
  useTokenCount,
  useUpcomingSchedule,
} from '../notifications/scheduleView'
import { useNotificationSettings } from '../notifications/useNotificationSettings'

type FilterKey = 'all' | 'church' | 'personal'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'church', label: 'Church' },
  { key: 'personal', label: 'Personal' },
]

/**
 * Read-only view of every notification the automation will fire this month —
 * the church calendar (services, prayer, live alerts) plus each member's
 * personal greetings — so the admin always knows what goes out next.
 * Data comes from the Apps Script endpoint that owns the real schedule.
 */
export function NotificationScheduleScreen() {
  const navigate = useNavigate()
  // Shared cached query — the Access page's switches invalidate it, so this
  // page reflects a flipped switch immediately.
  const { data: schedule, isError: error } = useUpcomingSchedule()
  const [filter, setFilter] = useState<FilterKey>('all')
  const now = useMemo(() => new Date(), [])

  const filteredEvents = useMemo(() => {
    if (!schedule) return []
    return schedule.events.filter((e) => {
      // Admin-scheduled announcements are church-wide sends, so they belong
      // under the Church filter with the calendar entries.
      const isChurchWide = e.kind === 'church' || e.kind === 'scheduled'
      if (filter === 'church') return isChurchWide
      if (filter === 'personal') return !isChurchWide
      return true
    })
  }, [schedule, filter])

  const eventsByDate = useMemo(() => {
    const groups: { date: string; events: UpcomingScheduleEvent[] }[] = []
    filteredEvents.forEach((event) => {
      const last = groups[groups.length - 1]
      if (last && last.date === event.date) last.events.push(event)
      else groups.push({ date: event.date, events: [event] })
    })
    return groups
  }, [filteredEvents])

  const nextTrigger = schedule ? findNextTrigger(schedule, now) : null
  const { data: deviceCount } = useTokenCount()
  const { data: settings } = useNotificationSettings()
  const automationPaused = settings ? !settings.enabled : false

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="Notification Schedule" onBack={() => navigate('/follow-ups')} />
      <p className="-mt-2 mb-4 pl-11 text-[12px] font-semibold text-slate">{schedule?.month ?? ''}</p>

      {error && (
        <Card className="p-6 text-center">
          <p className="text-[12.5px] text-slate">
            Could not load the schedule — make sure the latest Apps Script version is deployed, then try
            again.
          </p>
        </Card>
      )}

      {!error && !schedule && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      )}

      {!error && schedule && (
        <>
          {nextTrigger && (
            <div className="mb-4">
              <NextNotificationCard
                trigger={nextTrigger}
                now={now}
                deviceCount={deviceCount ?? null}
                paused={automationPaused}
              />
            </div>
          )}

          {/* REPEATS DAILY */}
          {filter !== 'personal' && schedule.daily.length > 0 && (
            <Card className="mb-4 p-4">
              <h2 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
                <Icon name="refresh" className="icon !h-[12px] !w-[12px]" />
                Repeats Every Day
              </h2>
              <div className="space-y-2">
                {[...schedule.daily]
                  .sort((a, b) => (a.time < b.time ? -1 : 1))
                  .map((entry) => (
                    <div key={entry.key} className="flex items-center gap-2.5">
                      <span className="w-[64px] shrink-0 font-mono text-[11.5px] font-semibold text-heading">
                        {formatTime12(entry.time)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-charcoal">
                        {cleanTitle(entry.title)}
                      </span>
                      {entry.live && <LiveBadge />}
                    </div>
                  ))}
                <div className="flex items-center gap-2.5 border-t border-hairline pt-2">
                  <span className="w-[64px] shrink-0 font-mono text-[11.5px] font-semibold text-heading">
                    7:00 PM
                  </span>
                  <span className="min-w-0 flex-1 text-[12px] text-slate">
                    Welcome message for anyone who registers today (first-time visitors)
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* FILTERS */}
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

          {/* MONTH TIMELINE */}
          {eventsByDate.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-[12.5px] text-slate">
                Nothing else scheduled this month{filter !== 'all' ? ' for this filter' : ''} — daily prayer
                notifications continue as shown above.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {eventsByDate.map((group) => (
                <section key={group.date}>
                  <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate">
                    {dayLabel(group.date, now)}
                    <span className="ml-1.5 font-normal normal-case text-faint">
                      {toDateTime(group.date, '00:00').toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </h3>
                  <Card>
                    {group.events.map((event, i) => (
                      <ScheduleEventRow key={`${event.kind}-${event.time}-${event.memberId ?? i}`} event={event} />
                    ))}
                  </Card>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
