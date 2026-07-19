const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string

/**
 * Attendance backend (Google Sheets via Apps Script). Two concerns:
 *  1. Attendance Takers — volunteers granted a magic-link login scoped to the
 *     attendance + add-member screens only.
 *  2. Attendance records — one entry per member marked present per date, kept
 *     for ~2 months.
 * Same text/plain POST trick as the other APIs — a JSON Content-Type would
 * trigger a CORS preflight Apps Script rejects.
 */

async function postAction<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Request failed')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return data as T
}

// ---------- Attendance takers ----------

/** One attendance taker as shown on the admin roster (never includes a token). */
export type AttendanceTaker = {
  email: string
  grantedOn: string
  active: boolean
  name: string
  whatsapp: string
}

/** What a grant returns — includes the one-time token for building the link. */
export type GrantedTaker = { email: string; token: string; name: string; whatsapp: string }

/**
 * Grant (or re-activate) an attendance taker. Returns the token ONCE so the
 * caller can build the invite link; re-granting an existing email reuses their
 * token, so an already-sent link keeps working. Name/WhatsApp are stored so
 * the roster shows them and Resend can target the number.
 * @param {{email: string, name?: string, whatsapp?: string}} input
 * @returns {Promise<GrantedTaker>}
 */
export async function grantAttendanceTaker(input: {
  email: string
  name?: string
  whatsapp?: string
}): Promise<GrantedTaker> {
  const data = await postAction<{ ok: boolean } & GrantedTaker>({
    action: 'grantTaker',
    email: input.email,
    name: input.name ?? '',
    whatsapp: input.whatsapp ?? '',
  })
  return { email: data.email, token: data.token, name: data.name ?? '', whatsapp: data.whatsapp ?? '' }
}

/**
 * Revoke an attendance taker — their link stops working immediately.
 * @param {string} email who to revoke
 */
export async function revokeAttendanceTaker(email: string): Promise<void> {
  await postAction({ action: 'revokeTaker', email })
}

/**
 * Verify a magic-link token (the taker's login). Active tokens only.
 * @param {string} token from the invite link
 * @returns {Promise<{ok: boolean, email?: string}>}
 */
export async function verifyAttendanceTaker(
  token: string,
): Promise<{ ok: boolean; email?: string; name?: string }> {
  const res = await fetch(`${BASE_URL}?verifyTaker=${encodeURIComponent(token)}`)
  if (!res.ok) throw new Error('Verification failed')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return { ok: data.ok === true, email: data.email, name: data.name }
}

/**
 * Sign in an attendance taker by email only — the backend checks the email is
 * on the active takers list and returns their token so the session persists.
 * @param {string} email the taker's email
 * @returns {Promise<{ok: boolean, email?: string, name?: string, token?: string}>}
 */
export async function signInTakerByEmail(
  email: string,
): Promise<{ ok: boolean; email?: string; name?: string; token?: string }> {
  const data = await postAction<{ ok: boolean; email?: string; name?: string; token?: string }>({
    action: 'takerSignIn',
    email,
  })
  return { ok: data.ok === true, email: data.email, name: data.name, token: data.token }
}

/**
 * The admin's attendance-taker roster (emails + status, no tokens).
 * @returns {Promise<AttendanceTaker[]>}
 */
export async function fetchAttendanceTakers(): Promise<AttendanceTaker[]> {
  const res = await fetch(`${BASE_URL}?takers=list`)
  if (!res.ok) throw new Error('Failed to load attendance takers')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  if (!data || !Array.isArray(data.items)) {
    throw new Error('Attendance takers endpoint not available — deploy the latest Apps Script version')
  }
  return data.items as AttendanceTaker[]
}

// ---------- Attendance records ----------

/**
 * Mark one member present/absent for a date. Present upserts the row; absent
 * removes it. Idempotent — safe to retry.
 * @param {{date: string, memberId: string, memberName?: string, present: boolean, markedBy?: string}} record
 */
export async function saveAttendanceRecord(record: {
  date: string
  memberId: string
  memberName?: string
  present: boolean
  markedBy?: string
}): Promise<void> {
  await postAction({ action: 'saveAttendance', ...record })
}

/** A date with its present-count, for the admin history list. */
export type AttendanceSummaryItem = { date: string; count: number }

/**
 * Attendance history — each recorded date with its present-count, newest first.
 * @returns {Promise<AttendanceSummaryItem[]>}
 */
export async function fetchAttendanceSummary(): Promise<AttendanceSummaryItem[]> {
  const res = await fetch(`${BASE_URL}?attendance=summary`)
  if (!res.ok) throw new Error('Failed to load attendance summary')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  if (!data || !Array.isArray(data.items)) {
    throw new Error('Attendance endpoint not available — deploy the latest Apps Script version')
  }
  return data.items as AttendanceSummaryItem[]
}

/** One member present on a given date. */
export type AttendanceRecordItem = {
  memberId: string
  memberName: string
  markedBy: string
  markedAt: string
}

/**
 * Who was present on a specific date.
 * @param {string} date yyyy-MM-dd
 * @returns {Promise<AttendanceRecordItem[]>}
 */
export async function fetchAttendanceForDate(date: string): Promise<AttendanceRecordItem[]> {
  const res = await fetch(`${BASE_URL}?attendance=${encodeURIComponent(date)}`)
  if (!res.ok) throw new Error('Failed to load attendance')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return Array.isArray(data.items) ? (data.items as AttendanceRecordItem[]) : []
}

/**
 * The dates a specific member was marked present (newest first).
 * @param {string} memberId the SLF-#### id
 * @returns {Promise<string[]>} yyyy-MM-dd dates
 */
export async function fetchAttendanceForMember(memberId: string): Promise<string[]> {
  const res = await fetch(`${BASE_URL}?attendance=member-${encodeURIComponent(memberId)}`)
  if (!res.ok) throw new Error('Failed to load member attendance')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return Array.isArray(data.items) ? data.items.map((d: { date: string }) => d.date) : []
}
