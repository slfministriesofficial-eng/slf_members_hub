import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { ToggleSwitch } from '../components/ui/ToggleSwitch'
import { isFirebaseConfigured } from '../firebase'
import { isMessagingSupported } from '../firebase-messaging'
import {
  enableNotifications,
  getPermission,
  getStoredTokenRecord,
  wasPermissionDenied,
} from './NotificationService'

type OptInState =
  | 'checking'
  | 'notconfigured'
  | 'unsupported'
  | 'blocked'
  | 'ready'
  | 'enabling'
  | 'enabled'
  | 'error'

/** getToken() can hang if the permission prompt is ignored or FCM stalls —
 *  after this long we stop waiting and let the member try again. */
const ENABLE_TIMEOUT_MS = 25_000

/**
 * "Get Church Notifications" card for the public member-profile page (the
 * page every ID card's QR code opens). Members tap Enable once and their
 * device is registered — linked to their Member ID with audience "member" —
 * to receive service reminders, announcements, and live alerts.
 * Standalone by design: the public page is unauthenticated, so this uses the
 * NotificationService directly rather than the admin NotificationProvider.
 * @param {{memberId: string}} props the member this device belongs to
 */
export function PublicNotificationOptIn({ memberId }: { memberId: string }) {
  const [state, setState] = useState<OptInState>('checking')

  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  useEffect(() => {
    let cancelled = false
    isMessagingSupported().then((supported) => {
      if (cancelled) return
      if (!supported) {
        // A build without the Firebase env vars is a deployment problem, not
        // a browser problem — say so, or every phone looks "unsupported".
        setState(isFirebaseConfigured() ? 'unsupported' : 'notconfigured')
      } else if (getPermission() === 'granted' && getStoredTokenRecord()?.token) {
        setState('enabled')
      } else if (wasPermissionDenied()) {
        setState('blocked')
      } else {
        setState('ready')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  /** Prompt once, register the token for this member, reflect the outcome.
   *  Guarded by a timeout so a hung getToken() can never freeze on "Enabling…". */
  async function handleEnable() {
    setState('enabling')
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('enable-timeout')), ENABLE_TIMEOUT_MS),
      )
      const result = await Promise.race([enableNotifications(memberId, 'member'), timeout])
      if (result.permission === 'granted' && result.token) {
        setState('enabled')
      } else if (result.permission === 'denied') {
        setState('blocked')
      } else {
        // Permission left unanswered, or granted but no token came back.
        setState('error')
      }
    } catch (error) {
      console.error('[Notifications] Public opt-in failed:', error)
      setState('error')
    }
  }

  const notEnabled = state === 'ready' || state === 'enabling' || state === 'error'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface p-6 text-center shadow-card sm:p-8">
      {/* Small attention pill (top) — pulses to draw the eye until enabled. */}
      {notEnabled && (
        <span className="motion-safe:animate-[pulse-soft_1.8s_ease-in-out_infinite] absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brass/15 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide text-brass-deep">
          <Icon name="bell" className="icon !h-[10px] !w-[10px]" />
          Recommended
        </span>
      )}

      <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep">
        <Icon name="bell" className="icon !h-[24px] !w-[24px] text-white" />
      </span>
      <h2 className="font-display text-[19px] font-bold text-heading">Get Church Notifications</h2>
      <p className="mx-auto mt-2 max-w-[400px] text-[13px] leading-relaxed text-slate">
        Service reminders, church announcements, and live worship alerts from SLF Ministries — straight to
        this device.
      </p>

      <div className="mt-5">
        {state === 'checking' && <p className="text-[12.5px] text-slate">Checking your device…</p>}

        {state === 'notconfigured' && (
          <p className="mx-auto max-w-[380px] text-[12.5px] leading-relaxed text-slate">
            Notifications are being set up for this site — please check back soon.
          </p>
        )}

        {state === 'unsupported' && (
          <p className="mx-auto max-w-[380px] text-[12.5px] leading-relaxed text-slate">
            {isIos && !isStandalone
              ? 'On iPhone: tap the Share button and choose "Add to Home Screen", then open the app from your home screen to enable notifications.'
              : "This browser doesn't support notifications — try opening this page in Chrome."}
          </p>
        )}

        {state === 'blocked' && (
          <p className="mx-auto max-w-[380px] text-[12.5px] leading-relaxed text-slate">
            Notifications are blocked for this site. To receive church updates, allow notifications for this
            page in your browser settings.
          </p>
        )}

        {(state === 'ready' || state === 'enabling' || state === 'enabled') && (
          <div className="mx-auto flex max-w-[360px] items-center justify-between gap-3 rounded-2xl border border-hairline bg-paper px-4 py-3">
            <div className="min-w-0 text-left">
              <div className="text-[13px] font-bold text-heading">
                {state === 'enabled' ? 'Notifications on' : 'Turn on notifications'}
              </div>
              <div className="text-[11px] text-slate">
                {state === 'enabling'
                  ? 'Enabling…'
                  : state === 'enabled'
                    ? "You'll get church updates on this device"
                    : 'One tap to receive church updates'}
              </div>
            </div>
            <ToggleSwitch
              checked={state === 'enabled'}
              disabled={state === 'enabling' || state === 'enabled'}
              label="Enable church notifications"
              onChange={() => handleEnable()}
            />
          </div>
        )}

        {state === 'error' && (
          <>
            <p className="mx-auto mb-3 max-w-[380px] text-[12.5px] leading-relaxed text-status-alert-fg">
              We couldn't finish enabling notifications. When the browser asks, choose <strong>Allow</strong>,
              then try again.
            </p>
            <button
              onClick={handleEnable}
              className="mx-auto flex items-center justify-center gap-1.5 rounded-full bg-ink px-6 py-3 text-[13.5px] font-bold text-white transition-transform hover:scale-105"
            >
              <Icon name="bell" className="icon !h-[15px] !w-[15px]" />
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  )
}
