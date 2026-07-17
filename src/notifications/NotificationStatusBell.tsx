import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '../components/ui/Icon'
import { fetchMemberNotificationStatuses, type MemberNotificationStatus } from './api'
import { useNotificationSettings, useSetMemberMuted } from './useNotificationSettings'

/**
 * Shared, cached map of which members have push notifications enabled —
 * fetched once and reused by every bell on screen (React Query dedupes the
 * request no matter how many cards render at once).
 * @returns react-query result whose data is a Record keyed by Member ID
 */
export function useMemberNotificationStatuses() {
  return useQuery({
    queryKey: ['member-notification-statuses'],
    queryFn: fetchMemberNotificationStatuses,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

function formatRegistered(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso || '—'
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/**
 * Small push-notification status bell shown beside the MEMBER badge on every
 * member card across the app: green bell = this member has at least one
 * registered device; muted bell = none; amber crossed bell = paused by the
 * admin (they receive nothing until resumed). Tapping it (this is an
 * admin-only app) opens a popover with device/browser/last-registered details
 * and a Pause/Resume control — the token itself is never shown, and never
 * even leaves the server. Clicks stop propagation so the card's own tap
 * action never fires.
 * @param {{memberId: string, className?: string}} props the member's ID (SLF-xxxx)
 */
export function NotificationStatusBell({ memberId, className = '' }: { memberId: string; className?: string }) {
  const { data } = useMemberNotificationStatuses()
  const { data: settings } = useNotificationSettings()
  const setMuted = useSetMemberMuted()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)

  const status: MemberNotificationStatus | undefined = data?.[memberId]
  const enabled = Boolean(status)
  const muted = Boolean(settings?.muted.includes(memberId))

  const stateLabel = muted
    ? 'Notifications Paused by Admin'
    : enabled
      ? 'Push Notifications Enabled'
      : 'Push Notifications Not Enabled'

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

  return (
    <span ref={rootRef} className={`relative inline-flex shrink-0 ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* Filled circles so the state reads at a glance — a solid green dot
          for enabled (a green stroke alone was too faint to notice). */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={stateLabel}
        title={stateLabel}
        className={`flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 ${
          muted ? 'bg-tint-amber-bg' : enabled ? 'bg-status-regular-fg' : 'bg-paper-2'
        }`}
      >
        <Icon
          name={muted ? 'bell-off' : 'bell'}
          className={`icon !h-[11px] !w-[11px] ${
            muted ? 'text-tint-amber-fg' : enabled ? 'text-white' : 'text-faint'
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-60 rounded-2xl bg-surface p-3.5 text-left shadow-elev ring-1 ring-hairline">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-slate">Push Notifications</p>
          <PopoverRow label="Status">
            <span
              className={`font-bold ${
                muted ? 'text-tint-amber-fg' : enabled ? 'text-status-regular-fg' : 'text-status-alert-fg'
              }`}
            >
              {muted ? 'Paused' : enabled ? 'Enabled' : 'Disabled'}
            </span>
          </PopoverRow>
          {enabled && status && (
            <>
              <PopoverRow label="Device">{status.platform || '—'}</PopoverRow>
              <PopoverRow label="Browser">{status.browser || '—'}</PopoverRow>
              <PopoverRow label="Last Registered">{formatRegistered(status.updatedAt)}</PopoverRow>
              {status.devices > 1 && <PopoverRow label="Devices">{String(status.devices)}</PopoverRow>}
              <PopoverRow label="FCM Token">
                <span className="inline-flex items-center gap-1 text-slate">
                  <Icon name="lock-small" className="icon !h-[10px] !w-[10px]" />
                  Hidden
                </span>
              </PopoverRow>
            </>
          )}
          {!enabled && !muted && (
            <p className="mt-1 text-[11px] leading-relaxed text-slate">
              This member has not enabled notifications on any device yet.
            </p>
          )}
          {muted && (
            <p className="mt-1 text-[11px] leading-relaxed text-slate">
              Paused by admin — this member receives no notifications (announcements or greetings) until
              resumed.
            </p>
          )}

          {/* Pause/Resume — only when the backend supports the controls
              endpoint (settings loaded), so old deployments never show a
              button that can't work. */}
          {settings && (
            <button
              type="button"
              disabled={setMuted.isPending}
              onClick={() => setMuted.mutate({ memberId, muted: !muted })}
              className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11.5px] font-bold transition-colors disabled:opacity-50 ${
                muted
                  ? 'bg-ink text-white'
                  : 'border border-hairline bg-paper text-heading hover:bg-paper-2'
              }`}
            >
              <Icon name={muted ? 'bell' : 'bell-off'} className="icon !h-[12px] !w-[12px]" />
              {setMuted.isPending ? 'Saving…' : muted ? 'Resume Notifications' : 'Pause Notifications'}
            </button>
          )}
          {setMuted.isError && (
            <p className="mt-1.5 text-center text-[10.5px] font-semibold text-status-alert-fg">
              Could not save — try again.
            </p>
          )}
        </div>
      )}
    </span>
  )
}

function PopoverRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline py-1.5 text-[11.5px] last:border-b-0">
      <span className="shrink-0 text-slate">{label}</span>
      <span className="truncate text-right font-semibold text-heading">{children}</span>
    </div>
  )
}
