import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { cleanTitle, KIND_META, useNotificationHistory } from '../notifications/scheduleView'

/** Icon/label for a history row's kind — falls back for kinds KIND_META lacks. */
function historyMeta(kind: string): { icon: string; accent: string; label: string } {
  if (kind in KIND_META) return KIND_META[kind as keyof typeof KIND_META]
  if (kind === 'announcement') return { icon: 'megaphone', accent: 'text-brass-deep', label: 'Announcement' }
  if (kind === 'visitor-welcome') return { icon: 'heart', accent: 'text-brass-deep', label: 'Welcome' }
  return { icon: 'bell', accent: 'text-heading', label: 'Notification' }
}

/** "Today · 6:32 PM" for same-day sends, "15 Jul · 8:00 AM" otherwise. */
function timeLabel(iso: string, now: Date): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Today · ${time}`
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ` · ${time}`
}

/**
 * Full "Notifications sent" list — the View-all destination from the
 * dashboard. Shows every notification delivered this month (the backend keeps
 * only the current month), newest first, with the reached-device count.
 */
export function NotificationsSentScreen() {
  const navigate = useNavigate()
  const { data: history, isError, isLoading } = useNotificationHistory()
  const now = useMemo(() => new Date(), [])

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="Notifications Sent" onBack={() => navigate('/')} />
      <p className="-mt-2 mb-4 pl-11 text-[12px] text-slate">
        Delivered this month{history ? ` · ${history.length}` : ''}
      </p>

      {isError ? (
        <Card className="p-6 text-center">
          <p className="text-[12.5px] text-slate">
            Could not load — make sure the latest Apps Script version is deployed, then try again.
          </p>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      ) : !history || history.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-[12.5px] text-slate">Nothing sent yet this month.</p>
        </Card>
      ) : (
        <Card>
          {history.map((item, i) => {
            const meta = historyMeta(item.kind)
            return (
              <div
                key={`${item.sentAt}-${i}`}
                className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-3 last:border-b-0"
              >
                <Icon name={meta.icon} className={`icon !h-[15px] !w-[15px] shrink-0 ${meta.accent}`} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold text-heading">
                    {cleanTitle(item.title) || meta.label}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-slate">
                    {timeLabel(item.sentAt, now)}
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
    </div>
  )
}
