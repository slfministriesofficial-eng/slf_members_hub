import { useQuery } from '@tanstack/react-query'
import { Icon } from '../components/ui/Icon'
import {
  fetchNotificationHistory,
  fetchTokenCount,
  fetchUpcomingSchedule,
  type UpcomingSchedule,
  type UpcomingScheduleEvent,
} from './api'

/**
 * Cached upcoming-schedule fetch, shared by every surface that shows the
 * "next notification" (bell panel, dashboards) — one request, many readers.
 * @returns react-query result whose data is the UpcomingSchedule
 */
export function useUpcomingSchedule() {
  return useQuery({
    queryKey: ['upcoming-schedule'],
    queryFn: fetchUpcomingSchedule,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

/**
 * Total registered devices — exactly how many devices a church-wide trigger
 * will reach when it fires. Cached and shared wherever it's shown.
 * @returns react-query result whose data is the device count
 */
export function useTokenCount() {
  return useQuery({
    queryKey: ['fcm-token-count'],
    queryFn: fetchTokenCount,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

/**
 * This month's completed sends for the dashboard's "Notifications sent" card.
 * Short staleTime so a send that just finished shows up quickly.
 * @returns react-query result whose data is NotificationHistoryItem[]
 */
export function useNotificationHistory() {
  return useQuery({
    queryKey: ['notification-history'],
    queryFn: fetchNotificationHistory,
    staleTime: 60 * 1000,
    retry: 1,
  })
}

/** Icon + accent color per notification kind (SVG icons — no emoji in UI). */
export const KIND_META: Record<UpcomingScheduleEvent['kind'], { icon: string; accent: string; label: string }> = {
  church: { icon: 'bell', accent: 'text-brass-deep', label: 'Church' },
  birthday: { icon: 'cake', accent: 'text-tint-amber-fg', label: 'Birthday' },
  'wedding-anniversary': { icon: 'rings', accent: 'text-tint-pink-fg', label: 'Anniversary' },
  'membership-anniversary': { icon: 'heart', accent: 'text-brass-deep', label: 'Membership' },
  'baptism-anniversary': { icon: 'cross', accent: 'text-heading', label: 'Baptism' },
  scheduled: { icon: 'megaphone', accent: 'text-brass-deep', label: 'Scheduled' },
}

/**
 * Notification titles in the backend carry the emoji that goes into the
 * actual push text — the app UI uses SVG icons instead, so strip any
 * leading emoji/symbols before rendering.
 */
export function cleanTitle(title: string): string {
  return title.replace(/^[^\p{L}\p{N}]+/u, '').trim()
}

/** 'HH:mm' → '5:30 PM' */
export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

/** 'yyyy-MM-dd' + 'HH:mm' → a local Date. */
export function toDateTime(date: string, time: string): Date {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  return new Date(y, mo - 1, d, h, mi)
}

/** "Today" / "Tomorrow" / "Sat, 19 Jul" */
export function dayLabel(dateStr: string, now: Date): string {
  const date = toDateTime(dateStr, '00:00')
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

/** "in 2h 15m" / "in 3d 4h" / "now" */
export function countdownLabel(target: Date, now: Date): string {
  const diffMinutes = Math.round((target.getTime() - now.getTime()) / 60000)
  if (diffMinutes <= 0) return 'now'
  const days = Math.floor(diffMinutes / 1440)
  const hours = Math.floor((diffMinutes % 1440) / 60)
  const minutes = diffMinutes % 60
  if (days > 0) return `in ${days}d ${hours}h`
  if (hours > 0) return `in ${hours}h ${minutes}m`
  return `in ${minutes}m`
}

export type NextTrigger = { title: string; when: Date; live: boolean; memberName?: string }

/**
 * The soonest upcoming trigger — compares the first dated event against the
 * next daily-repeating slot (today's next remaining time, or tomorrow's
 * earliest when today is done).
 */
export function findNextTrigger(schedule: UpcomingSchedule, now: Date): NextTrigger | null {
  const candidates: NextTrigger[] = []

  const firstEvent = schedule.events[0]
  if (firstEvent) {
    candidates.push({
      title: cleanTitle(firstEvent.title),
      when: toDateTime(firstEvent.date, firstEvent.time),
      live: firstEvent.live,
      memberName: firstEvent.memberName,
    })
  }

  const sortedDaily = [...schedule.daily].sort((a, b) => (a.time < b.time ? -1 : 1))
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const todayNext = sortedDaily.find((d) => {
    const [h, m] = d.time.split(':').map(Number)
    return h * 60 + m > nowMinutes
  })
  const daily = todayNext ?? sortedDaily[0]
  if (daily) {
    const [h, m] = daily.time.split(':').map(Number)
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
    if (!todayNext) when.setDate(when.getDate() + 1)
    candidates.push({ title: cleanTitle(daily.title), when, live: daily.live })
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.when.getTime() - b.when.getTime())
  return candidates[0]
}

/** Small red "Live" pill used on stream-alert rows. */
export function LiveBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-status-alert-bg px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-status-alert-fg">
      <span className="h-1.5 w-1.5 rounded-full bg-status-alert-fg" />
      Live
    </span>
  )
}

/**
 * Navy hero card announcing the single next notification the automation will
 * fire — shared by the Follow-ups dashboard and the full schedule page.
 * Shows how many registered devices the trigger will reach, so the admin
 * knows the send capacity at a glance. Personal greetings go only to that
 * member's own devices, so the chip is hidden for those.
 */
export function NextNotificationCard({
  trigger,
  now,
  deviceCount,
  pendingCount,
  paused,
}: {
  trigger: NextTrigger
  now: Date
  deviceCount?: number | null
  /** Members who haven't enabled notifications yet — shown as a second chip. */
  pendingCount?: number | null
  /** Master automation switch is off — the trigger will NOT fire. */
  paused?: boolean
}) {
  const dateStr = `${trigger.when.getFullYear()}-${String(trigger.when.getMonth() + 1).padStart(2, '0')}-${String(
    trigger.when.getDate(),
  ).padStart(2, '0')}`
  const timeStr = `${trigger.when.getHours()}:${String(trigger.when.getMinutes()).padStart(2, '0')}`
  const showReach = !trigger.memberName && typeof deviceCount === 'number'
  const showPending = !trigger.memberName && typeof pendingCount === 'number'

  return (
    <div className="motion-safe:animate-[gradient-drift_8s_ease_infinite] relative overflow-hidden rounded-[22px] bg-gradient-to-br from-ink-deep via-ink to-ink-soft bg-[length:200%_200%] p-5 text-white shadow-card">
      {/* Softly-pulsing brass glow + slowly drifting gradient — same decorative
          treatment the old dashboard hero card had, now animated. */}
      <div className="motion-safe:animate-[pulse-soft_5s_ease-in-out_infinite] pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-brass/50 blur-2xl" />

      <div className="relative mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#B9C2DA]">Next Notification</p>
        {paused && (
          <span className="inline-flex items-center gap-1 rounded-full bg-status-alert-bg px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-status-alert-fg">
            <Icon name="bell-off" className="icon !h-[10px] !w-[10px]" />
            Paused
          </span>
        )}
      </div>
      <div className="relative flex items-center gap-2">
        <span className="font-display text-[18px] font-bold leading-tight">{trigger.title}</span>
        {trigger.live && <LiveBadge />}
      </div>
      {trigger.memberName && <p className="relative mt-0.5 text-[12px] text-white/75">{trigger.memberName}</p>}
      <p className="relative mt-1.5 text-[12.5px] text-white/85">
        {dayLabel(dateStr, now)} · {formatTime12(timeStr)} ·{' '}
        {paused ? (
          <span className="font-bold text-[#F0A9A4]">will not send while paused</span>
        ) : (
          <span className="font-bold text-brass">{countdownLabel(trigger.when, now)}</span>
        )}
      </p>
      {(showReach || showPending) && (
        <div className="relative mt-3.5 flex gap-2">
          {showReach && (
            <span className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-brass px-3 py-2 text-[11.5px] font-bold text-ink-deep sm:flex-none sm:px-4 sm:text-[12px]">
              <Icon name="bell" className="icon !h-[13px] !w-[13px]" />
              Reaches {deviceCount} device{deviceCount === 1 ? '' : 's'}
            </span>
          )}
          {showPending && (
            <span className="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-surface/15 px-3 py-2 text-[11.5px] font-bold text-white sm:flex-none sm:px-4 sm:text-[12px]">
              <Icon name="bell-off" className="icon !h-[13px] !w-[13px] text-white/70" />
              Pending {pendingCount} member{pendingCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * One timeline row — time, kind icon, title, optional member name, and a
 * Live/type badge. Shared by the Follow-ups preview and the full schedule page.
 */
export function ScheduleEventRow({ event, showDay, now }: { event: UpcomingScheduleEvent; showDay?: boolean; now?: Date }) {
  const meta = KIND_META[event.kind]
  return (
    <div className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-3 last:border-b-0">
      <span className="w-[60px] shrink-0 font-mono text-[11.5px] font-semibold text-heading">
        {showDay && now ? dayLabel(event.date, now).replace(',', '') : formatTime12(event.time)}
      </span>
      <Icon name={meta.icon} className={`icon !h-[15px] !w-[15px] shrink-0 ${meta.accent}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-semibold text-heading">
          {cleanTitle(event.title)}
          {showDay && <span className="ml-1.5 font-mono text-[10.5px] font-normal text-slate">{formatTime12(event.time)}</span>}
        </div>
        {event.memberName && <div className="truncate text-[11px] text-slate">{event.memberName}</div>}
      </div>
      {event.live ? (
        <LiveBadge />
      ) : (
        <span className="shrink-0 rounded-full bg-paper-2 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate">
          {meta.label}
        </span>
      )}
    </div>
  )
}
