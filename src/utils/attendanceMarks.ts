import { saveAttendanceRecord } from '../attendance/api'

// sessionStorage keeps today's marks so the dashboard (AttendanceScreen) and
// the full marking list (AttendanceMarkAllScreen) share the same live data
// across navigation (same pattern as utils/completedWishes.ts) — it's the
// instant UI cache. Each toggle is ALSO pushed to the backend via
// syncAttendance() so the mark is persisted (2-month history in Sheets).
export type AttendanceMark = { markedAt: number }
export type AttendanceMarksMap = Record<string, AttendanceMark>

const STORAGE_KEY = 'slf-attendance-marks'

export function getAttendanceMarks(): AttendanceMarksMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AttendanceMarksMap) : {}
  } catch {
    return {}
  }
}

export function setAttendanceMarks(marks: AttendanceMarksMap): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(marks))
  } catch {
    // sessionStorage unavailable — marks just won't persist across navigation this session
  }
}

/** Today as yyyy-MM-dd in local time (the date each mark is filed under). */
export function attendanceDateKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Persist one mark to the backend (fire-and-forget). The sessionStorage cache
 * already reflects the tick in the UI, so a failed save just isn't recorded —
 * it never blocks or breaks the marking flow.
 * @param memberId the SLF-#### member id
 * @param memberName display name stored alongside the mark
 * @param present true = present, false = removed
 * @param markedBy who marked it (taker email or admin name)
 */
export function syncAttendance(
  memberId: string,
  memberName: string,
  present: boolean,
  markedBy: string,
): Promise<void> {
  // Returns the promise so the caller can surface a failure (the mark still
  // shows locally from the sessionStorage cache regardless).
  return saveAttendanceRecord({ date: attendanceDateKey(), memberId, memberName, present, markedBy })
}

// Present (checked) <-> not present (unchecked) — the only two states now
// that a single checkbox replaced the separate Present/Absent buttons.
export function togglePresence(memberId: string): AttendanceMarksMap {
  const marks = getAttendanceMarks()
  const next = { ...marks }
  if (next[memberId]) {
    delete next[memberId]
  } else {
    next[memberId] = { markedAt: Date.now() }
  }
  setAttendanceMarks(next)
  return next
}
