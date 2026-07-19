import { useEffect, useMemo, useState } from 'react'
import { useMembers } from '../features/members/MembersContext'
import { deriveBirthdays, deriveAnniversaries } from '../utils/celebrations'
import { getCompletedKeys, wishKey, primeCompletedWishes } from '../utils/completedWishes'
import type { Member } from '../mock/types'

const SEEN_MEMBERS_KEY = 'slf-seen-member-ids'
const SEEN_CELEBRATIONS_KEY = 'slf-seen-celebrations'
// Fired whenever something that feeds the badges changes (member list seen,
// a wish marked completed) so nav badges — which stay mounted across route
// changes — recompute immediately instead of waiting for a data refetch.
const ALERTS_CHANGED_EVENT = 'slf-alerts-changed'

/** Tell every mounted useAlertCounts() to recompute right now. */
export function notifyAlertsChanged(): void {
  window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT))
}

/**
 * IDs the admin has already "seen" on the Members page — null when nothing
 * was ever stored (first launch), which callers treat as "everyone seen"
 * so a fresh install doesn't greet the admin with a giant badge.
 */
function getSeenMemberIds(): Set<string> | null {
  try {
    const raw = localStorage.getItem(SEEN_MEMBERS_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

/**
 * Record the current roster as seen (called when the Members pages open) —
 * clears the Members badge everywhere.
 * @param members the currently loaded roster
 */
export function markMembersSeen(members: Member[]): void {
  try {
    localStorage.setItem(SEEN_MEMBERS_KEY, JSON.stringify(members.map((m) => m.id)))
  } catch {
    // storage unavailable — badge just won't clear this session
  }
  notifyAlertsChanged()
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/**
 * Celebration IDs the admin has seen TODAY — date-stamped so badges come
 * back fresh each morning (a birthday you saw yesterday still deserves
 * today's reminder if it's today's birthday).
 */
function getSeenCelebrationIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_CELEBRATIONS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as { date: string; ids: string[] }
    return parsed.date === todayKey() ? new Set(parsed.ids) : new Set()
  } catch {
    return new Set()
  }
}

/**
 * Mark today's/this week's celebrations as seen (called when the Birthdays &
 * Anniversaries page opens) — clears its badges until new ones appear or the
 * day changes.
 * @param memberIds members whose celebrations were on screen
 */
export function markCelebrationsSeen(memberIds: string[]): void {
  try {
    localStorage.setItem(SEEN_CELEBRATIONS_KEY, JSON.stringify({ date: todayKey(), ids: memberIds }))
  } catch {
    // ignore
  }
  notifyAlertsChanged()
}

export type AlertCounts = {
  /** Members added since the admin last opened the Members page. */
  newMembers: number
  /** Today's birthdays + anniversaries still needing wishes. */
  celebrationsToday: number
  /** This week's (next 7 days) birthdays + anniversaries still needing wishes. */
  celebrationsWeek: number
}

/**
 * All nav-badge counts, computed from data the app already has — no backend
 * calls. Recomputes when the roster changes or notifyAlertsChanged() fires
 * (wish sent, members seen).
 * @returns {AlertCounts} the live badge counts
 */
export function useAlertCounts(): AlertCounts {
  const { members } = useMembers()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    window.addEventListener(ALERTS_CHANGED_EVENT, bump)
    // Pull the shared "wished this year" set from the backend so badges match
    // what was wished on other devices (fires ALERTS_CHANGED_EVENT when ready).
    primeCompletedWishes()
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, bump)
  }, [])

  return useMemo(() => {
    const completed = getCompletedKeys()
    const seenCelebrations = getSeenCelebrationIds()
    // A badge clears when the celebration is either wished (per its own
    // occasion) OR its page was viewed today — "I saw it" stops the blinking.
    const birthdays = deriveBirthdays(members).filter(
      (e) => !completed.has(wishKey(e.member.id, 'birthday')) && !seenCelebrations.has(e.member.id),
    )
    const anniversaries = deriveAnniversaries(members).filter(
      (e) => !completed.has(wishKey(e.member.id, 'wedding')) && !seenCelebrations.has(e.member.id),
    )
    const celebrations = [...birthdays, ...anniversaries]
    const seen = getSeenMemberIds()

    return {
      newMembers: seen === null ? 0 : members.filter((m) => !seen.has(m.id)).length,
      celebrationsToday: celebrations.filter((e) => e.daysAway === 0).length,
      celebrationsWeek: celebrations.filter((e) => e.daysAway <= 7).length,
    }
    // version is the external-event invalidation counter — see the listener above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, version])
}

/**
 * Which count a given nav route's badge shows — shared by the Sidebar,
 * NavDrawer, and BottomNav so all three always agree.
 * @param counts the live counts
 * @param to the nav item's route
 * @returns {number} the badge count for that route (0 = no badge)
 */
export function badgeForRoute(counts: AlertCounts, to: string): number {
  if (to === '/members') return counts.newMembers
  if (to === '/birthdays') return counts.celebrationsToday
  return 0
}

/** One row in the global notification-center panel. */
export type AlertItem = {
  key: string
  icon: string
  title: string
  subtitle?: string
  to: string
}

function firstNames(names: string[], max = 3): string {
  const shown = names.slice(0, max)
  const rest = names.length - shown.length
  return shown.join(', ') + (rest > 0 ? ` +${rest} more` : '')
}

/**
 * The notification-center's row items + total badge count + a clear-all
 * action — built from the same seen/completed filters as the nav badges, so
 * the bell and the panel can never disagree.
 * @returns {{items: AlertItem[], total: number, clearAll: () => void}}
 */
export function useAlertItems(): { items: AlertItem[]; total: number; clearAll: () => void } {
  const { members } = useMembers()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1)
    window.addEventListener(ALERTS_CHANGED_EVENT, bump)
    // Pull the shared "wished this year" set from the backend so badges match
    // what was wished on other devices (fires ALERTS_CHANGED_EVENT when ready).
    primeCompletedWishes()
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, bump)
  }, [])

  return useMemo(() => {
    const completed = getCompletedKeys()
    const seenCelebrations = getSeenCelebrationIds()
    const seenMembers = getSeenMemberIds()

    const birthdays = deriveBirthdays(members).map((e) => ({ ...e, kind: 'Birthday', occasion: 'birthday' as const }))
    const anniversaries = deriveAnniversaries(members).map((e) => ({
      ...e,
      kind: 'Anniversary',
      occasion: 'wedding' as const,
    }))
    const celebrationsToday = [...birthdays, ...anniversaries].filter(
      (e) =>
        e.daysAway === 0 &&
        !completed.has(wishKey(e.member.id, e.occasion)) &&
        !seenCelebrations.has(e.member.id),
    )

    const unseenMembers = seenMembers === null ? [] : members.filter((m) => !seenMembers.has(m.id))

    const items: AlertItem[] = []
    if (celebrationsToday.length > 0) {
      items.push({
        key: 'celebrations',
        icon: 'cake',
        title: `${celebrationsToday.length} celebration${celebrationsToday.length === 1 ? '' : 's'} today`,
        subtitle: firstNames(celebrationsToday.map((e) => `${e.member.name.split(' ')[0]} (${e.kind})`)),
        to: '/birthdays',
      })
    }
    if (unseenMembers.length > 0) {
      items.push({
        key: 'new-members',
        icon: 'users',
        title: `${unseenMembers.length} new member${unseenMembers.length === 1 ? '' : 's'} added`,
        subtitle: firstNames(unseenMembers.map((m) => `${m.name.split(' ')[0]} · ${m.memberId}`)),
        to: '/members',
      })
    }

    const total = celebrationsToday.length + unseenMembers.length

    const clearAll = () => {
      markMembersSeen(members)
      const weekIds = [...birthdays, ...anniversaries].filter((e) => e.daysAway <= 7).map((e) => e.member.id)
      markCelebrationsSeen(weekIds)
    }

    return { items, total, clearAll }
    // version is the external-event invalidation counter — see the listener above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, version])
}
