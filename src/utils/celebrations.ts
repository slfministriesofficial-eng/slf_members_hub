import type { Member } from '../mock/types'

// Kept separate from utils/upcomingDates.ts (used by HomeScreen) so extending
// the Birthdays page can't change that existing widget's behavior.

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? null : d
}

// new Date(year, month, day) silently rolls into the next month when day
// doesn't exist in that month (e.g. Feb 29 in a non-leap year becomes Mar 1) —
// clamp to that month's real last day instead, so it lands on Feb 28.
function clampToValidDate(year: number, month: number, day: number): Date {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDayOfMonth))
}

// Same month/day this year, or next year if that's already passed.
function nextOccurrence(month: number, day: number, from: Date): Date {
  const year = from.getFullYear()
  const occurrence = clampToValidDate(year, month, day)
  return occurrence < from ? clampToValidDate(year + 1, month, day) : occurrence
}

export function calculateAge(dob: string | undefined, now = new Date()): number | null {
  const d = parseDate(dob)
  if (!d) return null
  let age = now.getFullYear() - d.getFullYear()
  const hasHadBirthdayThisYear =
    now.getMonth() > d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age >= 0 ? age : null
}

export function calculateYearsMarried(anniversary: string | undefined, now = new Date()): number | null {
  return calculateAge(anniversary, now)
}

export function daysUntil(target: Date, from: Date): number {
  const ms = startOfDay(target).getTime() - startOfDay(from).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function formatCountdown(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} Days`
}

// A quick-glance label for a forward-looking date (next birthday/anniversary
// occurrence) — exact day count while it's close (up to 60 days / ~2 months),
// otherwise just the month name it falls in (e.g. "September") since an exact
// day count stops being easy to read at a glance once it's that far out.
export function formatUpcomingLabel(target: Date, now: Date): string {
  const days = daysUntil(target, now)
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days <= 60) return `In ${days} Days`
  return target.toLocaleDateString('en-US', { month: 'long' })
}

// Same idea for a backward-looking date (when a member joined).
export function formatPastLabel(target: Date, now: Date): string {
  const days = daysUntil(now, target)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days <= 60) return `${days} Days Ago`
  return target.toLocaleDateString('en-US', { month: 'long' })
}

export function isSameCalendarMonth(date: Date, now: Date): boolean {
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

export type BirthdayEntry = {
  member: Member
  nextDate: Date
  daysAway: number
  age: number | null
  isThisMonth: boolean
}

export type AnniversaryEntry = {
  member: Member
  nextDate: Date
  daysAway: number
  yearsMarried: number | null
  isThisMonth: boolean
}

export type NewMemberEntry = {
  member: Member
  joinedDate: Date
  daysAgo: number
}

export function deriveBirthdays(members: Member[], now = new Date()): BirthdayEntry[] {
  const today = startOfDay(now)
  return members
    .map((member) => {
      const d = parseDate(member.dob)
      if (!d) return null
      const nextDate = nextOccurrence(d.getMonth(), d.getDate(), today)
      return {
        member,
        nextDate,
        daysAway: daysUntil(nextDate, today),
        age: calculateAge(member.dob, nextDate),
        isThisMonth: d.getMonth() === now.getMonth(),
      }
    })
    .filter((e): e is BirthdayEntry => e !== null)
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
}

export function deriveAnniversaries(members: Member[], now = new Date()): AnniversaryEntry[] {
  const today = startOfDay(now)
  return members
    .map((member) => {
      const d = parseDate(member.anniversary)
      if (!d) return null
      const nextDate = nextOccurrence(d.getMonth(), d.getDate(), today)
      return {
        member,
        nextDate,
        daysAway: daysUntil(nextDate, today),
        yearsMarried: calculateYearsMarried(member.anniversary, nextDate),
        isThisMonth: d.getMonth() === now.getMonth(),
      }
    })
    .filter((e): e is AnniversaryEntry => e !== null)
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
}

// Registration is a one-time past event (not a recurring annual date like a
// birthday), so "new members" looks backward from today instead of forward.
export function deriveNewMembers(members: Member[], now = new Date()): NewMemberEntry[] {
  const today = startOfDay(now)
  return members
    .map((member) => {
      const d = parseDate(member.joiningDateRaw || member.registrationDate)
      if (!d) return null
      const joinedDate = startOfDay(d)
      const daysAgo = daysUntil(today, joinedDate)
      return { member, joinedDate, daysAgo }
    })
    .filter((e): e is NewMemberEntry => e !== null && e.daysAgo >= 0)
    .sort((a, b) => b.joinedDate.getTime() - a.joinedDate.getTime())
}
