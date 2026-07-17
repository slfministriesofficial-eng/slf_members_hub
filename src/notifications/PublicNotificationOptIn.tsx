import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { isFirebaseConfigured } from '../firebase'
import { isMessagingSupported } from '../firebase-messaging'
import {
  enableNotifications,
  getPermission,
  getStoredTokenRecord,
  wasPermissionDenied,
} from './NotificationService'

type OptInState = 'checking' | 'notconfigured' | 'unsupported' | 'blocked' | 'ready' | 'enabling' | 'enabled'

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

  /** Prompt once, register the token for this member, reflect the outcome. */
  async function handleEnable() {
    setState('enabling')
    try {
      const result = await enableNotifications(memberId, 'member')
      if (result.permission === 'granted' && result.token) {
        setState('enabled')
      } else if (result.permission === 'denied') {
        setState('blocked')
      } else {
        setState('ready')
      }
    } catch (error) {
      console.error('[Notifications] Public opt-in failed:', error)
      setState('ready')
    }
  }

  return (
    <div className="rounded-2xl bg-surface p-6 text-center shadow-card sm:p-8">
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

        {(state === 'ready' || state === 'enabling') && (
          <button
            onClick={handleEnable}
            disabled={state === 'enabling'}
            className="mx-auto flex items-center justify-center gap-1.5 rounded-full bg-ink px-6 py-3 text-[13.5px] font-bold text-white transition-transform hover:scale-105 disabled:opacity-50"
          >
            <Icon name="bell" className="icon !h-[15px] !w-[15px]" />
            {state === 'enabling' ? 'Enabling…' : 'Enable Notifications'}
          </button>
        )}

        {state === 'enabled' && (
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-status-regular-bg px-4 py-2 text-[12.5px] font-bold text-status-regular-fg">
            <Icon name="check" className="icon !h-[14px] !w-[14px]" />
            Notifications enabled on this device
          </div>
        )}
      </div>
    </div>
  )
}
