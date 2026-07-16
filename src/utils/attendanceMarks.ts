// Session-local attendance presence store — there is no attendance backend
// yet, so today's marks live in sessionStorage instead of component state.
// That's what lets the dashboard (AttendanceScreen) and the full marking
// list (AttendanceMarkAllScreen) share the same live data across navigation,
// the same pattern as utils/completedWishes.ts.
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
