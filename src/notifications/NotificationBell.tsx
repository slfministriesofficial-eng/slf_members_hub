import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { CountBadge } from '../components/ui/CountBadge'
import { useAlertItems, type AlertItem } from '../hooks/useAlertCounts'
import { getAttendanceMarks } from '../utils/attendanceMarks'
import {
  useUpcomingSchedule,
  findNextTrigger,
  formatTime12,
  dayLabel,
  countdownLabel,
} from './scheduleView'

/**
 * The global notification bell — one on the mobile app bar, one on the
 * desktop top bar. Shows a pulsing count badge for everything pending
 * (celebrations, welcomes, new members, Sunday attendance) and opens the
 * Notification Center: a bottom sheet on mobile, a dropdown on desktop.
 * @param {{variant: 'mobile' | 'desktop'}} props which chrome hosts it
 */
export function NotificationBell({ variant }: { variant: 'mobile' | 'desktop' }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { items: alertItems, total: alertTotal, clearAll } = useAlertItems()
  const { data: schedule } = useUpcomingSchedule()

  // Sunday nudge — only until any attendance has been marked that day.
  const now = new Date()
  const attendancePending = now.getDay() === 0 && Object.keys(getAttendanceMarks()).length === 0
  const items: AlertItem[] = [
    ...(attendancePending
      ? [{ key: 'attendance', icon: 'cal-check', title: 'Sunday — take attendance', to: '/attendance' }]
      : []),
    ...alertItems,
  ]
  const total = alertTotal + (attendancePending ? 1 : 0)

  const nextTrigger = schedule ? findNextTrigger(schedule, now) : null

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function go(to: string) {
    setOpen(false)
    navigate(to)
  }

  const panel = (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-elev ring-1 ring-hairline">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <span className="font-display text-[14px] font-bold text-heading">Notifications</span>
        {total > 0 && (
          <button
            onClick={clearAll}
            className="text-[11.5px] font-bold text-brass-deep transition-colors hover:text-heading"
          >
            Clear all
          </button>
        )}
      </div>

      {nextTrigger && (
        <button
          onClick={() => go('/follow-ups/schedule')}
          className="flex w-full items-center gap-3 border-b border-hairline bg-paper px-4 py-3 text-left transition-colors hover:bg-paper-2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep">
            <Icon name="bell" className="icon !h-[14px] !w-[14px] text-white" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-bold text-heading">Next: {nextTrigger.title}</span>
            <span className="block text-[11px] text-slate">
              {dayLabel(
                `${nextTrigger.when.getFullYear()}-${String(nextTrigger.when.getMonth() + 1).padStart(2, '0')}-${String(nextTrigger.when.getDate()).padStart(2, '0')}`,
                now,
              )}{' '}
              · {formatTime12(`${nextTrigger.when.getHours()}:${String(nextTrigger.when.getMinutes()).padStart(2, '0')}`)} ·{' '}
              <span className="font-bold text-brass-deep">{countdownLabel(nextTrigger.when, now)}</span>
            </span>
          </span>
          <Icon name="chevron" className="icon !h-[13px] !w-[13px] shrink-0 text-faint" />
        </button>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-status-regular-bg">
            <Icon name="check" className="icon !h-[18px] !w-[18px] text-status-regular-fg" />
          </span>
          <p className="text-[12.5px] font-semibold text-heading">You're all caught up</p>
          <p className="text-[11px] text-slate">Nothing needs your attention right now.</p>
        </div>
      ) : (
        items.map((item) => (
          <button
            key={item.key}
            onClick={() => go(item.to)}
            className="flex w-full items-center gap-3 border-b border-hairline px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-paper"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-2">
              <Icon name={item.icon} className="icon !h-[14px] !w-[14px] text-brass-deep" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-bold text-heading">{item.title}</span>
              {item.subtitle && <span className="block truncate text-[11px] text-slate">{item.subtitle}</span>}
            </span>
            <Icon name="chevron" className="icon !h-[13px] !w-[13px] shrink-0 text-faint" />
          </button>
        ))
      )}
    </div>
  )

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface text-heading shadow-card transition-transform hover:scale-105"
      >
        <Icon name="bell" className="icon !h-[16px] !w-[16px]" />
        <CountBadge count={total} className="absolute -right-1 -top-1" />
      </button>

      {open &&
        (variant === 'desktop' ? (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80">{panel}</div>
        ) : (
          <div className="fixed inset-0 z-[70]">
            <div
              onClick={() => setOpen(false)}
              className="motion-safe:animate-[fade-rise_0.2s_ease-out] absolute inset-0 bg-black/50"
            />
            <div className="motion-safe:animate-[fade-rise_0.25s_ease-out] absolute inset-x-3 bottom-4 max-h-[75vh] overflow-y-auto rounded-2xl">
              {panel}
            </div>
          </div>
        ))}
    </div>
  )
}
