import type { MessagePayload, Unsubscribe } from 'firebase/messaging'
import {
  isMessagingSupported,
  fetchFcmToken,
  invalidateFcmToken,
  onForegroundFcmMessage,
  registerMessagingServiceWorker,
} from '../firebase-messaging'
import { saveFcmTokenRecord, deleteFcmTokenRecord, detectBrowser, detectPlatform, type TokenAudience } from './api'

/** localStorage record of the last token this browser successfully saved. */
type StoredTokenRecord = {
  token: string
  memberId: string
  updatedAt: string
}

const TOKEN_STORAGE_KEY = 'slf-fcm-token'
// Once denied, browsers won't re-show the prompt anyway — this flag lets the
// UI show a friendly "enable it in browser settings" message instead of
// pointlessly calling requestPermission() again (requirement 12).
const DENIED_FLAG_KEY = 'slf-fcm-denied'
// Even an unchanged token is re-confirmed to the backend this often, so the
// sheet's updatedAt shows which registrations are still alive.
const RESAVE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Read the last-saved token record, tolerating missing/corrupt storage.
 * @returns {StoredTokenRecord | null} the stored record, if any
 */
export function getStoredTokenRecord(): StoredTokenRecord | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredTokenRecord) : null
  } catch {
    return null
  }
}

function storeTokenRecord(record: StoredTokenRecord): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(record))
  } catch {
    // Storage unavailable — worst case the token is re-saved next launch.
  }
}

function clearStoredTokenRecord(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/**
 * Whether the user previously denied the permission prompt (requirement:
 * never nag with repeat prompts).
 * @returns {boolean} true when a past prompt was denied
 */
export function wasPermissionDenied(): boolean {
  try {
    return Notification.permission === 'denied' || localStorage.getItem(DENIED_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Current Notification permission, safe on browsers without the API.
 * @returns {NotificationPermission} "granted" | "denied" | "default"
 */
export function getPermission(): NotificationPermission {
  return typeof Notification !== 'undefined' ? Notification.permission : 'denied'
}

/**
 * Ask the browser for notification permission — but only when the state is
 * still "default". Granted/denied states are returned as-is without
 * re-prompting (the browser wouldn't show a prompt again anyway).
 * @returns {Promise<NotificationPermission>} the resulting permission
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission !== 'default') return Notification.permission

  const result = await Notification.requestPermission()
  if (result === 'denied') {
    try {
      localStorage.setItem(DENIED_FLAG_KEY, '1')
    } catch {
      // ignore
    }
  }
  return result
}

/**
 * Get the current FCM token for this browser (registers the FCM service
 * worker on first use). Returns null when permission isn't granted or the
 * environment doesn't support push.
 * @returns {Promise<string | null>} the FCM registration token
 */
export async function getFCMToken(): Promise<string | null> {
  if (getPermission() !== 'granted') return null
  if (!(await isMessagingSupported())) return null
  return fetchFcmToken()
}

/**
 * Save a token to the Google Sheets backend, linked to a member ID —
 * skipping the network call entirely when the same token was already saved
 * for the same member recently (requirement 13: no duplicate registrations).
 * @param {string} memberId who this browser/token belongs to
 * @param {string} token the FCM registration token
 * @param {boolean} [force] save even if the stored record looks fresh
 * @param {TokenAudience} [audience] "admin" (default) or "member"
 * @returns {Promise<boolean>} true when a save request was actually sent
 */
export async function saveToken(
  memberId: string,
  token: string,
  force = false,
  audience: TokenAudience = 'admin',
): Promise<boolean> {
  const stored = getStoredTokenRecord()
  const isSameRegistration = stored?.token === token && stored?.memberId === memberId
  const isFresh = stored ? Date.now() - new Date(stored.updatedAt).getTime() < RESAVE_INTERVAL_MS : false
  if (!force && isSameRegistration && isFresh) return false

  const updatedAt = new Date().toISOString()
  await saveFcmTokenRecord({
    memberId,
    token,
    platform: detectPlatform(),
    browser: detectBrowser(),
    updatedAt,
    audience,
  })
  storeTokenRecord({ token, memberId, updatedAt })
  return true
}

/**
 * Full startup flow: if permission was already granted, refresh the token
 * (Firebase rotates them silently) and re-save it when it changed or went
 * stale — without ever showing a prompt. Call once per app launch.
 * @param {string} memberId identity to link the token to
 * @param {TokenAudience} [audience] "admin" (default) or "member"
 * @returns {Promise<string | null>} the active token, or null when not enabled
 */
export async function initializeNotifications(
  memberId: string,
  audience: TokenAudience = 'admin',
): Promise<string | null> {
  try {
    if (!(await isMessagingSupported())) return null
    if (getPermission() !== 'granted') return null

    const token = await getFCMToken()
    if (!token) return null
    await saveToken(memberId, token, false, audience)
    return token
  } catch (error) {
    console.error('[Notifications] Initialization failed:', error)
    return null
  }
}

/**
 * Interactive enable flow (call from a button click): prompt once, then
 * register + save the token.
 * @param {string} memberId identity to link the token to
 * @param {TokenAudience} [audience] "admin" (default) or "member"
 * @returns {Promise<{permission: NotificationPermission, token: string | null}>}
 */
export async function enableNotifications(
  memberId: string,
  audience: TokenAudience = 'admin',
): Promise<{ permission: NotificationPermission; token: string | null }> {
  const permission = await requestPermission()
  if (permission !== 'granted') return { permission, token: null }

  const token = await getFCMToken()
  if (token) {
    try {
      await saveToken(memberId, token, true, audience)
    } catch (error) {
      // Token works locally even if the backend save failed — surface the
      // token so pushes still arrive; the weekly re-save will retry.
      console.error('[Notifications] Token save failed:', error)
    }
  }
  return { permission, token }
}

/**
 * Disable notifications for this browser: invalidate the FCM token, remove
 * its backend record, and clear local state. (Permission itself can only be
 * revoked from browser settings — this stops all pushes regardless.)
 * @returns {Promise<void>} resolves when local + remote cleanup finished
 */
export async function deleteToken(): Promise<void> {
  const stored = getStoredTokenRecord()
  await invalidateFcmToken()
  if (stored?.token) {
    try {
      await deleteFcmTokenRecord(stored.token)
    } catch (error) {
      console.error('[Notifications] Backend token delete failed:', error)
    }
  }
  clearStoredTokenRecord()
}

/**
 * Subscribe to pushes that arrive while the app is open, showing a real
 * browser notification (with the church logo) for each — the service worker
 * only covers background delivery, so without this foreground pushes would
 * be silent.
 * @param {(payload: MessagePayload) => void} [onPayload] extra in-app handler
 * @returns {Unsubscribe} call to stop listening
 */
export function onForegroundMessage(onPayload?: (payload: MessagePayload) => void): Unsubscribe {
  return onForegroundFcmMessage(async (payload) => {
    try {
      // Data fields first — our backend sends data-only messages (see the
      // service worker for why); notification fields cover console test sends.
      const title = payload.data?.title ?? payload.notification?.title ?? 'SLF Members Hub'
      const body = payload.data?.body ?? payload.notification?.body ?? ''
      const registration = await registerMessagingServiceWorker()
      await registration.showNotification(title, {
        body,
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
        tag: payload.data?.tag ?? 'slf-members-hub',
        data: { url: payload.data?.url ?? '/' },
      })
    } catch (error) {
      console.error('[Notifications] Failed to display foreground notification:', error)
    }
    onPayload?.(payload)
  })
}

/**
 * Show a local test notification so the admin can verify the setup end to
 * end without needing a real push from the server.
 * @returns {Promise<boolean>} true when the notification was shown
 */
export async function sendTestNotification(): Promise<boolean> {
  if (getPermission() !== 'granted') return false
  try {
    const registration = await registerMessagingServiceWorker()
    await registration.showNotification('SLF Members Hub', {
      body: 'Test notification — everything is working!',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      tag: 'slf-test',
      data: { url: '/' },
    })
    return true
  } catch (error) {
    console.error('[Notifications] Test notification failed:', error)
    return false
  }
}

/**
 * Copy the current FCM token to the clipboard (handy for testing sends from
 * the Firebase console, which targets a specific token).
 * @returns {Promise<boolean>} true when a token existed and was copied
 */
export async function copyToken(): Promise<boolean> {
  const stored = getStoredTokenRecord()
  if (!stored?.token) return false
  try {
    await navigator.clipboard.writeText(stored.token)
    return true
  } catch {
    return false
  }
}
