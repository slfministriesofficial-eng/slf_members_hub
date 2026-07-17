/* global firebase, importScripts, clients */
// Firebase Cloud Messaging background handler for SLF Members Hub.
//
// This worker is registered at its OWN scope (/firebase-cloud-messaging-push-scope)
// by src/firebase-messaging.ts, so it runs alongside — never instead of — the
// vite-plugin-pwa Workbox service worker that controls the app at scope "/".
//
// The Firebase config arrives via the registration URL's query string
// (?apiKey=...&projectId=...), so no project values are hardcoded here.
// Service workers can't read Vite env vars, and these are public client
// identifiers, not secrets.

importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js')

/**
 * Parse the Firebase config out of this worker's registration URL.
 * @returns {{apiKey: string, authDomain: string, projectId: string, messagingSenderId: string, appId: string}}
 */
function readConfigFromUrl() {
  const params = new URLSearchParams(self.location.search)
  return {
    apiKey: params.get('apiKey') || '',
    authDomain: params.get('authDomain') || '',
    projectId: params.get('projectId') || '',
    messagingSenderId: params.get('messagingSenderId') || '',
    appId: params.get('appId') || '',
  }
}

firebase.initializeApp(readConfigFromUrl())

const messaging = firebase.messaging()

/**
 * Show a browser notification for a push received while the app is closed
 * or in the background. Our backend sends DATA-ONLY messages (title/body/url
 * inside payload.data) so this handler fully controls display — mixed
 * "notification" payloads would be auto-displayed by the FCM SDK too,
 * causing duplicates. Notification-type payloads (e.g. Firebase console
 * test sends) are still handled as a fallback.
 */
/** Label for the single action button, by link type. */
function actionLabelFor(linkType) {
  if (linkType === 'youtube') return 'Watch Live'
  if (linkType === 'location') return 'View Location'
  return 'Open Link'
}

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {}
  const notif = payload.notification || {}
  const title = data.title || notif.title || 'SLF Members Hub'
  const body = data.body || notif.body || ''
  const clickUrl = data.url || '/'

  // Show a tappable action button when there's a real destination link
  // (YouTube live / maps location / announcement link). Tapping the body
  // already opens the same URL — this just makes the "why tap" obvious.
  const hasLink = clickUrl && clickUrl !== '/'
  const actions = hasLink ? [{ action: 'open', title: actionLabelFor(data.linkType) }] : []

  self.registration.showNotification(title, {
    body,
    icon: '/pwa-192.png',
    // No badge on purpose: Android renders the badge as a monochrome alpha
    // silhouette, which turned the round full-color logo into a black blob.
    // Without one, Android shows a clean default glyph instead.
    // Unique tag per message kind so two notifications arriving at the same
    // time (e.g. Saturday 8 PM live + tomorrow's-service reminder) don't
    // replace each other.
    tag: data.tag || 'slf-members-hub',
    actions,
    data: { url: clickUrl },
  })
})

/**
 * Handle notification taps:
 * - External links (e.g. the YouTube live stream) always open in a new
 *   window/tab — never by navigating the app itself away.
 * - In-app links focus the already-open app when possible, else open it.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || '/'
  const isExternal = /^https?:\/\//.test(targetUrl) && !targetUrl.startsWith(self.location.origin)

  event.waitUntil(
    (async () => {
      if (isExternal) {
        await clients.openWindow(targetUrl)
        return
      }
      const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of windowClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client && targetUrl !== '/') await client.navigate(targetUrl)
          return
        }
      }
      await clients.openWindow(targetUrl)
    })(),
  )
})
