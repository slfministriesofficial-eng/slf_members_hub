import { calculateAge, daysUntil, nextOccurrence, parseDate, startOfDay } from '../../utils/celebrations'
import type { Pastor } from './types'

export type PastorBirthday = {
  pastor: Pastor
  nextDate: Date
  daysAway: number
  /** The age they turn on nextDate — not their age today. Quoting today's age
   *  in an advance greeting is off by one. */
  age: number | null
  isToday: boolean
}

/**
 * Pastor birthdays, soonest first. Entries without a usable date of birth are
 * left out rather than guessed at.
 *
 * Shared by the Pastors Birthdays page and the dashboard so the two can never
 * disagree about who is next — and so nobody re-implements the date maths and
 * loses the Feb-29 clamp that `nextOccurrence` carries.
 *
 * @param {Pastor[]} pastors the register
 * @param {Date} now reference moment
 * @returns {PastorBirthday[]} soonest first
 */
export function derivePastorBirthdays(pastors: Pastor[], now: Date): PastorBirthday[] {
  const today = startOfDay(now)
  return pastors
    .map((pastor) => {
      const dob = parseDate(pastor.dob)
      if (!dob) return null
      const nextDate = nextOccurrence(dob.getMonth(), dob.getDate(), today)
      const daysAway = daysUntil(nextDate, today)
      return {
        pastor,
        nextDate,
        daysAway,
        age: calculateAge(pastor.dob, nextDate),
        isToday: daysAway === 0,
      }
    })
    .filter((entry): entry is PastorBirthday => entry !== null)
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
}
