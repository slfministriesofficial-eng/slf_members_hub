import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { isMessagingSupported } from '../firebase-messaging'
import { updateMemberMuted } from './api'
import {
  enableNotifications,
  getPermission,
  getStoredTokenRecord,
  wasPermissionDenied,
} from './NotificationService'

const SNOOZE_KEY = 'slf.notify-prompt.snoozed-until'
const DISMISS_KEY = 'slf.notify-prompt.dismiss-count'

/** Each "Not now" pushes the next ask further out, so a member who keeps
 *  declining is never nagged again rather than asked on every visit. */
const SNOOZE_DAYS = [7, 30, 365]

/** Let the page paint and the member see whose profile this is first. */
const APPEAR_DELAY_MS = 2500

/** getToken() can hang if the permission prompt is ignored or FCM stalls. */
const ENABLE_TIMEOUT_MS = 25_000

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* non-blocking: worst case we ask again next visit */
  }
}

type PopupState = 'ready' | 'enabling' | 'enabled' | 'error'

/**
 * "Turn on notifications" popup for the public member page — the page every ID
 * card's QR code opens. The opt-in card further down that page is easy to
 * scroll past, so this asks for it directly on arrival.
 * Deliberately quiet unless notifications can actually be turned on right now:
 * if this browser can't do FCM (iOS Safari in a tab), or permission is already
 * granted or blocked, or the church paused this member, nothing appears and the
 * inline card explains the situation instead.
 * @param {{memberId: string, mutedByAdmin?: boolean}} props the member this device belongs to
 */
export function NotificationOptInPopup({
  memberId,
  mutedByAdmin,
}: {
  memberId: string
  mutedByAdmin?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const [state, setState] = useState<PopupState>('ready')

  useEffect(() => {
    if (mutedByAdmin) return // paused by the church — don't nag them to undo it
    if (Date.now() < readNumber(SNOOZE_KEY)) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    isMessagingSupported().then((supported) => {
      if (cancelled) return
      const alreadyOn = getPermission() === 'granted' && !!getStoredTokenRecord()?.token
      if (!supported || alreadyOn || wasPermissionDenied()) return
      timer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS)
    })

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [mutedByAdmin])

  function snooze() {
    const count = readNumber(DISMISS_KEY) + 1
    writeNumber(DISMISS_KEY, count)
    writeNumber(SNOOZE_KEY, Date.now() + SNOOZE_DAYS[Math.min(count, SNOOZE_DAYS.length) - 1] * 86_400_000)
    setVisible(false)
  }

  /** Prompt once, register this device to the member, then get out of the way. */
  async function handleEnable() {
    setState('enabling')
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('enable-timeout')), ENABLE_TIMEOUT_MS),
      )
      const result = await Promise.race([enableNotifications(memberId, 'member'), timeout])
      if (result.permission === 'granted' && result.token) {
        try {
          await updateMemberMuted(memberId, false)
        } catch {
          /* non-blocking — the token is already saved */
        }
        writeNumber(SNOOZE_KEY, 0)
        writeNumber(DISMISS_KEY, 0)
        setState('enabled')
        setTimeout(() => setVisible(false), 1600)
      } else if (result.permission === 'denied') {
        // Blocked at the browser level: nothing more this popup can do.
        setVisible(false)
      } else {
        setState('error')
      }
    } catch (error) {
      console.error('[Notifications] Popup opt-in failed:', error)
      setState('error')
    }
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink-deep/60 p-4 backdrop-blur-[2px] sm:items-center print:hidden"
      onClick={() => state !== 'enabling' && snooze()}
    >
      <div
        className="w-full max-w-[380px] rounded-3xl bg-surface p-6 text-center shadow-elev motion-safe:animate-[fade-rise_.28s_ease-out]"
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className={`mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-full ${
            state === 'enabled'
              ? 'bg-status-regular-bg'
              : 'bg-gradient-to-br from-brass to-brass-deep'
          }`}
        >
          <Icon
            name={state === 'enabled' ? 'check' : 'bell'}
            className={`icon !h-[24px] !w-[24px] ${
              state === 'enabled' ? 'text-status-regular-fg' : 'text-white'
            }`}
          />
        </span>

        <h2 className="font-display text-[19px] font-bold text-heading">
          {state === 'enabled' ? "You're all set" : 'Get Church Notifications'}
        </h2>
        <p className="mx-auto mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-slate">
          {state === 'enabled'
            ? "You'll now get church updates on this device."
            : 'Service reminders, church announcements, and live worship alerts from SLF Ministries — straight to this device.'}
        </p>

        {state === 'error' && (
          <p className="mx-auto mt-3 max-w-[300px] text-[12px] leading-relaxed text-status-alert-fg">
            We couldn't finish turning these on. When the browser asks, choose <strong>Allow</strong>.
          </p>
        )}

        {state !== 'enabled' && (
          <div className="mt-5 space-y-2.5">
            <button
              onClick={handleEnable}
              disabled={state === 'enabling'}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-[13.5px] font-bold text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              <Icon name="bell" className="icon !h-[15px] !w-[15px]" />
              {state === 'enabling' ? 'Enabling…' : state === 'error' ? 'Try Again' : 'Enable Notifications'}
            </button>
            <button
              onClick={snooze}
              disabled={state === 'enabling'}
              className="w-full rounded-full py-2.5 text-[12.5px] font-semibold text-slate hover:text-heading disabled:opacity-60"
            >
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
