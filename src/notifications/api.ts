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
 * Admin notification controls: the master automation switch, the list of
 * individually paused members (who receive nothing until resumed), and the
 * individually switched-off notification keys (SCHEDULE entry keys plus
 * the personal-greeting / scheduled-announcement type keys).
 */
export type NotificationSettings = { enabled: boolean; muted: string[]; disabled: string[] }

/**
 * Fetch the current notification-control state. Validates the shape so an
 * old Apps Script deployment (which answers unknown params with the member
 * list) surfaces as an error instead of breaking callers. `disabled` is
 * defaulted when absent so a backend one version behind still works.
 * @returns {Promise<NotificationSettings>} master switch + muted members + disabled keys
 */
export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const res = await fetch(`${BASE_URL}?settings=notifications`)
  if (!res.ok) throw new Error('Failed to load notification settings')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  if (!data || typeof data.enabled !== 'boolean' || !Array.isArray(data.muted)) {
    throw new Error('Settings endpoint not available — deploy the latest Apps Script version')
  }
  return {
    enabled: data.enabled,
    muted: data.muted,
    disabled: Array.isArray(data.disabled) ? data.disabled : [],
  }
}

/**
 * Switch ONE automatic notification on or off (per-trigger control from the
 * Access Settings page).
 * @param {string} key a SCHEDULE entry key (e.g. 'sun-worship-live') or a
 *   type key ('birthday', 'visitor-welcome', 'scheduled-announcements', …)
 * @param {boolean} enabled the new state for that notification
 * @returns {Promise<NotificationSettings>} the confirmed settings
 */
export async function updateNotificationKeyEnabled(
  key: string,
  enabled: boolean,
): Promise<NotificationSettings> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'setNotificationKeyEnabled', key, enabled }),
  })
  if (!res.ok) throw new Error('Failed to update notification')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return data as NotificationSettings
}

/**
 * Turn the entire automatic notification system on or off. While off, the
 * dispatcher sends nothing (church calendar, greetings, scheduled
 * announcements); manual sends from the Announcements page still work.
 * @param {boolean} enabled the new master-switch state
 * @returns {Promise<NotificationSettings>} the confirmed settings
 */
export async function updateNotificationsEnabled(enabled: boolean): Promise<NotificationSettings> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'setNotificationsEnabled', enabled }),
  })
  if (!res.ok) throw new Error('Failed to update notification settings')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return data as NotificationSettings
}

/**
 * Pause or resume ALL notifications (automatic and manual) for one member.
 * @param {string} memberId who to mute/unmute (SLF-xxxx)
 * @param {boolean} muted true to pause, false to resume
 * @returns {Promise<NotificationSettings>} the confirmed settings
 */
export async function updateMemberMuted(memberId: string, muted: boolean): Promise<NotificationSettings> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'setMemberMuted', memberId, muted }),
  })
  if (!res.ok) throw new Error('Failed to update member notifications')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return data as NotificationSettings
}

/** Per-member push registration summary (no token values ever included). */
export type MemberNotificationStatus = {
  memberId: string
  platform: string
  browser: string
  updatedAt: string
  devices: number
}

/**
 * Fetch which members have push notifications enabled — a map keyed by
 * Member ID. Members absent from the map have no registered device.
 * Validates the shape so an old Apps Script deployment (which answers with
 * the member list) surfaces as an error instead of breaking callers.
 * @returns {Promise<Record<string, MemberNotificationStatus>>} status by Member ID
 */
export async function fetchMemberNotificationStatuses(): Promise<Record<string, MemberNotificationStatus>> {
  const res = await fetch(`${BASE_URL}?tokens=status`)
  if (!res.ok) throw new Error('Failed to load notification statuses')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  if (!data || !Array.isArray(data.members)) {
    throw new Error('Status endpoint not available — deploy the latest Apps Script version')
  }
  const map: Record<string, MemberNotificationStatus> = {}
  for (const entry of data.members as MemberNotificationStatus[]) {
    if (entry && entry.memberId) map[entry.memberId] = entry
  }
  return map
}

/**
 * Schedule an announcement push for a future time — the Apps Script
 * dispatcher (which runs every 15 minutes) delivers it once the time
 * arrives, so delivery lands within ~15 minutes of the chosen moment.
 * @param {{title: string, body: string, url?: string, sendAt: string}} message
 *   sendAt as an ISO datetime, must be in the future
 * @returns {Promise<{sendAt: string}>} the confirmed scheduled time
 */
export async function schedulePushBroadcast(message: {
  title: string
  body: string
  url?: string
  sendAt: string
}): Promise<{ sendAt: string }> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'schedulePush', ...message }),
  })
  if (!res.ok) throw new Error('Failed to schedule notification')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return { sendAt: data.sendAt }
}

/** One daily-repeating schedule entry (shown once, not per-day). */
export type DailyScheduleEntry = { key: string; time: string; title: string; live: boolean }

/** One dated upcoming trigger (church calendar, personal greeting, or an admin-scheduled announcement). */
export type UpcomingScheduleEvent = {
  date: string
  time: string
  kind: 'church' | 'birthday' | 'wedding-anniversary' | 'membership-anniversary' | 'baptism-anniversary' | 'scheduled'
  title: string
  live: boolean
  memberName?: string
  memberId?: string
}

/** Everything the Notification Schedule page renders. */
export type UpcomingSchedule = {
  month: string
  daily: DailyScheduleEntry[]
  events: UpcomingScheduleEvent[]
}

/**
 * Fetch every notification the Apps Script dispatcher will fire between now
 * and the end of the current month — computed server-side so this page can
 * never drift from what actually gets sent.
 * Validates the response shape: an old Apps Script deployment (without the
 * schedule endpoint) answers this URL with the member list instead — that
 * must surface as a load error, never crash the page.
 * @returns {Promise<UpcomingSchedule>} month label, daily entries, dated events
 */
export async function fetchUpcomingSchedule(): Promise<UpcomingSchedule> {
  const res = await fetch(`${BASE_URL}?schedule=upcoming`)
  if (!res.ok) throw new Error('Failed to load schedule')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  if (!data || !Array.isArray(data.events) || !Array.isArray(data.daily)) {
    throw new Error('Schedule endpoint not available — deploy the latest Apps Script version')
  }
  return data as UpcomingSchedule
}

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
