import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { MobileBackButton } from '../components/ui/MobileBackButton'
import { TopAction } from '../components/ui/TopAction'
import { ViewAllButton } from '../components/ui/ViewAllButton'
import {
  findNextTrigger,
  NextNotificationCard,
  ScheduleEventRow,
  useTokenCount,
  useUpcomingSchedule,
} from '../notifications/scheduleView'
import { useNotificationSettings } from '../notifications/useNotificationSettings'

/** How many upcoming triggers the dashboard previews before "View All". */
const SCHEDULE_PREVIEW_LIMIT = 5

export function FollowUpsScreen() {
  const navigate = useNavigate()
  // Shared cached query — the Access page's switches invalidate it, so this
  // page reflects a flipped switch immediately.
  const { data: schedule, isError: scheduleError } = useUpcomingSchedule()

  const now = useMemo(() => new Date(), [])

  const nextTrigger = schedule ? findNextTrigger(schedule, now) : null
  // The first N events are dominated by the frequent church calendar (daily
  // prayer + weekly services), which would bury the occasional birthday /
  // anniversary below the fold. So guarantee upcoming personal celebrations
  // appear: take the first N chronologically, then fold in the next few
  // personal events not already shown, and re-sort.
  const previewEvents = useMemo(() => {
    if (!schedule) return []
    const personalKinds = ['birthday', 'wedding-anniversary', 'membership-anniversary', 'baptism-anniversary']
    const keyOf = (e: (typeof schedule.events)[number]) => `${e.date}-${e.time}-${e.kind}-${e.memberId ?? ''}`
    const firstFew = schedule.events.slice(0, SCHEDULE_PREVIEW_LIMIT)
    const shown = new Set(firstFew.map(keyOf))
    const extraPersonal = schedule.events
      .filter((e) => personalKinds.includes(e.kind) && !shown.has(keyOf(e)))
      .slice(0, 3)
    return [...firstFew, ...extraPersonal].sort((a, b) =>
      a.date === b.date ? (a.time < b.time ? -1 : a.time > b.time ? 1 : 0) : a.date < b.date ? -1 : 1,
    )
  }, [schedule])
  const { data: deviceCount } = useTokenCount()
  const { data: settings } = useNotificationSettings()
  const automationPaused = settings ? !settings.enabled : false

  return (
    <div>
      {/* Title + the page's own Schedule button share the top row — same
          alignment pattern as the Members and Attendance pages. */}
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <MobileBackButton />
          <h1 className="font-display text-[20px] font-bold text-heading md:text-[26px]">Follow-ups</h1>
        </div>
        <TopAction icon="cal-check" label="Schedule" onClick={() => navigate('/follow-ups/schedule')} />
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
              className={`mt-3 flex w-full items-center gap-2.5 rounded-2xl border px-4 py-3 text-left shadow-card transition-colors ${
                settings.enabled
                  ? 'border-brass/40 bg-gradient-to-br from-brass/15 via-surface to-surface hover:from-brass/20'
                  : 'border-status-alert-fg/30 bg-status-alert-bg hover:brightness-[0.98]'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  settings.enabled ? 'bg-gradient-to-br from-brass to-brass-deep' : 'bg-status-alert-fg'
                }`}
              >
                <Icon name={settings.enabled ? 'bell' : 'bell-off'} className="icon !h-[15px] !w-[15px] text-white" />
              </span>
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
            <ViewAllButton onClick={() => navigate('/follow-ups/schedule')} />
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

    </div>
  )
}
