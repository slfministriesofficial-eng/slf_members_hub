import type { Member, UpcomingDate } from '../mock/types'

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseMonthDay(dateStr: string | undefined): { month: number; day: number } | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  return { month: d.getMonth(), day: d.getDate() }
}

// Same month/day this year, or next year if that's already passed.
function nextOccurrence(month: number, day: number, from: Date): Date {
  const year = from.getFullYear()
  const occurrence = new Date(year, month, day)
  return occurrence < from ? new Date(year + 1, month, day) : occurrence
}

// Derives real upcoming birthdays, wedding anniversaries, and baptism anniversaries
// from member records — no attendance/care backend needed, these dates are already
// captured on the registration form.
export function getUpcomingDates(members: Member[], withinDays = 7, now = new Date()): UpcomingDate[] {
  const today = startOfDay(now)
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + withinDays)

  const events: { date: Date; who: string; what: string }[] = []

  members.forEach((m) => {
    const birthday = parseMonthDay(m.dob)
    if (birthday) events.push({ date: nextOccurrence(birthday.month, birthday.day, today), who: m.name, what: 'Birthday' })

    const anniversary = parseMonthDay(m.anniversary)
    if (anniversary) {
      events.push({ date: nextOccurrence(anniversary.month, anniversary.day, today), who: m.name, what: 'Wedding anniv.' })
    }

    const baptism = parseMonthDay(m.baptizedDate)
    if (baptism) {
      events.push({ date: nextOccurrence(baptism.month, baptism.day, today), who: m.name, what: 'Baptism anniv.' })
    }
  })

  return events
    .filter((e) => e.date >= today && e.date <= horizon)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e, i) => ({
      id: `u${i}`,
      day: String(e.date.getDate()),
      month: e.date.toLocaleDateString('en-US', { month: 'short' }),
      who: e.who,
      what: e.what,
    }))
}
