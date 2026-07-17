import {
  getMessaging,
  getToken,
  deleteToken as fcmDeleteToken,
  onMessage,
  isSupported,
  type Messaging,
  type MessagePayload,
  type Unsubscribe,
} from 'firebase/messaging'
import { getFirebaseApp, firebaseConfig, isFirebaseConfigured } from './firebase'

/** Public VAPID key for Web Push (safe to ship in client code). */
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

let messagingInstance: Messaging | null = null
let swRegistration: ServiceWorkerRegistration | null = null

/**
 * Whether this browser/context can do Web Push at all (secure context,
 * Notification + Push + Service Worker APIs, and FCM's own support check).
 * @returns {Promise<boolean>} true when FCM push is usable here
 */
export async function isMessagingSupported(): Promise<boolean> {
  if (!isFirebaseConfigured()) return false
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return false
  }
  try {
    return await isSupported()
  } catch {
    return false
  }
}

/**
 * Register the dedicated FCM service worker. It lives at its own scope
 * (/firebase-cloud-messaging-push-scope) so the existing vite-plugin-pwa
 * Workbox service worker at scope "/" keeps working untouched — the two
 * coexist. The Firebase config is passed via query string so the static
 * file in /public never hardcodes project values.
 * @returns {Promise<ServiceWorkerRegistration>} the FCM SW registration
 */
export async function registerMessagingServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (swRegistration) return swRegistration
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  })
  swRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params.toString()}`, {
    scope: '/firebase-cloud-messaging-push-scope',
  })
  return swRegistration
}

/**
 * Lazily create (or reuse) the Messaging instance.
 * @returns {Messaging} the shared Firebase Messaging instance
 */
function getMessagingInstance(): Messaging {
  if (!messagingInstance) {
    messagingInstance = getMessaging(getFirebaseApp())
  }
  return messagingInstance
}

/**
 * Fetch the current FCM registration token for this browser. Firebase
 * transparently rotates tokens — calling this on every app start returns the
 * fresh token, which the NotificationService compares against the last-saved
 * one to keep the backend up to date (requirement: auto-update on refresh).
 * @returns {Promise<string | null>} the token, or null when unavailable
 */
export async function fetchFcmToken(): Promise<string | null> {
  try {
    const registration = await registerMessagingServiceWorker()
    const token = await getToken(getMessagingInstance(), {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    return token || null
  } catch (error) {
    console.error('[FCM] Failed to fetch token:', error)
    return null
  }
}

/**
 * Invalidate the current FCM token so this browser stops receiving pushes.
 * @returns {Promise<boolean>} true when a token existed and was deleted
 */
export async function invalidateFcmToken(): Promise<boolean> {
  try {
    return await fcmDeleteToken(getMessagingInstance())
  } catch (error) {
    console.error('[FCM] Failed to delete token:', error)
    return false
  }
}

/**
 * Subscribe to messages that arrive while the app tab is open and focused
 * (the service worker only handles background delivery).
 * @param {(payload: MessagePayload) => void} handler called per foreground message
 * @returns {Unsubscribe} call to stop listening
 */
export function onForegroundFcmMessage(handler: (payload: MessagePayload) => void): Unsubscribe {
  return onMessage(getMessagingInstance(), handler)
}
