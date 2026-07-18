import type { Member, UpcomingDate, UpcomingEventKind } from '../mock/types'

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? null : d
}

// Same month/day this year, or next year if that's already passed.
function nextOccurrence(original: Date, from: Date): Date {
  const year = from.getFullYear()
  const occurrence = new Date(year, original.getMonth(), original.getDate())
  return occurrence < from ? new Date(year + 1, original.getMonth(), original.getDate()) : occurrence
}

/**
 * Derives the personal celebrations coming up in the next `withinDays` — plus
 * first-time visitors from the last `withinDays` — straight from member
 * records (no care backend needed). Five kinds:
 *   birthday   — from Date of Birth (every year)
 *   wedding    — from Anniversary Date (every year, after the wedding year)
 *   baptism    — from Baptism Date (every year, after the baptism year)
 *   membership — from Join Date (every year, after the joining year)
 *   visitor    — first-time visitors who registered in the last `withinDays`
 * @param members roster
 * @param withinDays look-ahead window (and look-back window for visitors)
 * @param now reference date
 * @returns sorted UpcomingDate rows (soonest first)
 */
export function getUpcomingDates(members: Member[], withinDays = 7, now = new Date()): UpcomingDate[] {
  const today = startOfDay(now)
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + withinDays)
  const lookback = new Date(today)
  lookback.setDate(lookback.getDate() - withinDays)

  const events: { date: Date; who: string; what: string; memberId: string; kind: UpcomingEventKind }[] = []

  // Annual celebration → next occurrence, kept only if it lands in the window.
  // `sinceYear` skips the starting year (a join/wedding/baptism this year isn't
  // an "anniversary" yet — the day itself is year zero).
  function addAnnual(
    raw: string | undefined,
    who: string,
    what: string,
    memberId: string,
    kind: UpcomingEventKind,
    skipStartingYear: boolean,
  ) {
    const original = parseDate(raw)
    if (!original) return
    const occurrence = nextOccurrence(original, today)
    if (occurrence < today || occurrence > horizon) return
    if (skipStartingYear && occurrence.getFullYear() <= original.getFullYear()) return
    events.push({ date: occurrence, who, what, memberId, kind })
  }

  members.forEach((m) => {
    addAnnual(m.dob, m.name, 'Birthday', m.memberId, 'birthday', false)
    addAnnual(m.anniversary, m.name, 'Wedding anniv.', m.memberId, 'wedding', true)
    addAnnual(m.baptizedDate, m.name, 'Baptism anniv.', m.memberId, 'baptism', true)
    addAnnual(m.joiningDateRaw, m.name, 'Membership anniv.', m.memberId, 'membership', true)

    // First-time visitors who registered within the last `withinDays` — shown
    // so the admin can welcome them. Uses the actual registration date.
    if (m.firstTimeVisiting) {
      const registered = parseDate(m.registrationDate)
      if (registered) {
        const regDay = startOfDay(registered)
        if (regDay >= lookback && regDay <= today) {
          events.push({ date: regDay, who: m.name, what: 'First visit', memberId: m.memberId, kind: 'visitor' })
        }
      }
    }
  })

  return events
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((e, i) => ({
      id: `u${i}`,
      day: String(e.date.getDate()),
      month: e.date.toLocaleDateString('en-US', { month: 'short' }),
      who: e.who,
      what: e.what,
      memberId: e.memberId,
      kind: e.kind,
    }))
}
