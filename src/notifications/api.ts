const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string

/**
 * Who a token belongs to: "admin" tokens get admin reminders (attendance,
 * birthdays-to-wish), "member" tokens get church-wide notifications
 * (service reminders, announcements, live alerts).
 */
export type TokenAudience = 'admin' | 'member'

/** Payload the Apps Script backend stores in the "FCM Tokens" sheet. */
export type SaveFcmTokenPayload = {
  memberId: string
  token: string
  platform: string
  browser: string
  updatedAt: string
  audience: TokenAudience
}

/**
 * Best-effort browser name from the user agent — stored alongside the token
 * so the sheet shows where each registration came from.
 * @returns {string} e.g. "Chrome", "Edge", "Safari", "Firefox", "Other"
 */
export function detectBrowser(): string {
  const ua = navigator.userAgent
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua)) return 'Chrome'
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari'
  if (/Firefox\//.test(ua)) return 'Firefox'
  return 'Other'
}

/**
 * Best-effort platform label ("Android", "iOS", "Windows", "macOS", "Other"),
 * plus a "(PWA)" suffix when running as an installed app.
 * @returns {string} platform label for the token record
 */
export function detectPlatform(): string {
  const ua = navigator.userAgent
  let platform = 'Other'
  if (/Android/.test(ua)) platform = 'Android'
  else if (/iPhone|iPad|iPod/.test(ua)) platform = 'iOS'
  else if (/Windows/.test(ua)) platform = 'Windows'
  else if (/Mac OS X/.test(ua)) platform = 'macOS'
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches
  return isInstalled ? `${platform} (PWA)` : platform
}

/**
 * Persist (upsert) an FCM token in Google Sheets via the Apps Script Web App.
 * Same text/plain trick as the members API — a JSON Content-Type would
 * trigger a CORS preflight that Apps Script rejects.
 * @param {SaveFcmTokenPayload} payload token + owner + device metadata
 * @returns {Promise<void>} resolves when the backend confirms the save
 */
export async function saveFcmTokenRecord(payload: SaveFcmTokenPayload): Promise<void> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'saveFcmToken', ...payload }),
  })
  if (!res.ok) throw new Error('Failed to save FCM token')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
}

/**
 * Remove an FCM token record from Google Sheets (used when the user disables
 * notifications locally, so the backend stops targeting a dead token).
 * @param {string} token the FCM token to remove
 * @returns {Promise<void>} resolves when the backend confirms the delete
 */
export async function deleteFcmTokenRecord(token: string): Promise<void> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'deleteFcmToken', token }),
  })
  if (!res.ok) throw new Error('Failed to delete FCM token')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
}

/**
 * How many devices are currently registered for push (drives the
 * "Send Notification to N devices" label on the Announcements page).
 * @returns {Promise<number>} registered token count
 */
export async function fetchTokenCount(): Promise<number> {
  const res = await fetch(`${BASE_URL}?tokens=count`)
  if (!res.ok) throw new Error('Failed to load token count')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return typeof data.count === 'number' ? data.count : 0
}

/** Result of a broadcast push send. */
export type PushBroadcastResult = { sent: number; failed: number }

/**
 * Ask the Apps Script backend to push a notification to every registered
 * device (the browser itself can't send FCM messages — that requires server
 * credentials, which live with Apps Script).
 * @param {{title: string, body: string, url?: string}} message what to send;
 *   url is where a tap takes the member (defaults to the app root)
 * @returns {Promise<PushBroadcastResult>} how many devices were reached
 */
export async function sendPushBroadcast(message: {
  title: string
  body: string
  url?: string
}): Promise<PushBroadcastResult> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'sendPush', ...message }),
  })
  if (!res.ok) throw new Error('Failed to send notification')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return { sent: data.sent ?? 0, failed: data.failed ?? 0 }
}
