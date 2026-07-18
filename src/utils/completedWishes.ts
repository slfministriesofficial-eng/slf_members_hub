import { useEffect, useState } from 'react'

// "Wished" ticks are stored on the BACKEND, keyed by member + occasion + year,
// so a wish sent on one device shows on every device — tracked SEPARATELY for
// each of the five occasions (birthday, wedding, baptism, membership, visitor
// welcome) since the dashboard shows all five — and cleared automatically next
// year. A localStorage copy (per year) gives instant paint + offline fallback.

/** The five celebration occasions each tracked with its own tick. */
export type WishOccasion = 'birthday' | 'wedding' | 'baptism' | 'membership' | 'visitor'

const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string
const CURRENT_YEAR = new Date().getFullYear()
const LOCAL_KEY = `slf-completed-wishes-${CURRENT_YEAR}`
// Literal event name (not imported from useAlertCounts) to avoid a module
// cycle — keeps nav badges + This-week ticks in sync the moment anything changes.
const CHANGED_EVENT = 'slf-alerts-changed'

/** Composite key for one wish: member + occasion (year is implicit in storage). */
export function wishKey(memberId: string, occasion: WishOccasion): string {
  return `${memberId}::${occasion}`
}

let cache: Set<string> = readLocal()
let primed = false
let priming: Promise<void> | null = null

function readLocal(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY)
    return raw ? new Set<string>(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function writeLocal(): void {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify([...cache]))
  } catch {
    // storage unavailable — the backend remains the source of truth
  }
}

function emitChanged(): void {
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

/** The raw set of `${memberId}::${occasion}` keys wished this year. */
export function getCompletedKeys(): Set<string> {
  return cache
}

/** Whether this member has been wished for this occasion this year. */
export function isWished(memberId: string, occasion: WishOccasion): boolean {
  return cache.has(wishKey(memberId, occasion))
}

/**
 * Mark a member wished for an occasion this year — updates the cache instantly,
 * then persists to the backend (fire-and-forget) so every device sees the tick.
 * @param memberId the member's SLF id
 * @param occasion which of the five celebrations
 * @param sentBy who sent it (admin name / taker email), for the record
 */
export function markCompleted(memberId: string, occasion: WishOccasion, sentBy = ''): void {
  cache = new Set(cache)
  cache.add(wishKey(memberId, occasion))
  writeLocal()
  emitChanged()
  if (BASE_URL) {
    fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'markWishSent', memberId, kind: occasion, year: CURRENT_YEAR, sentBy }),
    }).catch(() => {
      // best-effort — the local cache already shows the tick; a failed save
      // just isn't shared to other devices until the next successful mark.
    })
  }
}

/**
 * Load this year's wished set from the backend and merge it into the cache
 * (so ticks are shared across devices). Runs at most once per session unless
 * forced; safe to call from multiple components.
 * @param force refetch even if already primed
 */
export async function primeCompletedWishes(force = false): Promise<void> {
  if (!BASE_URL) return
  if (priming) return priming
  if (primed && !force) return
  priming = (async () => {
    try {
      const res = await fetch(`${BASE_URL}?wishes=sent`)
      const data = await res.json()
      if (data && Array.isArray(data.items)) {
        const merged = new Set(cache)
        data.items.forEach((item: { memberId: string; kind: string }) => {
          if (item && item.memberId && item.kind) merged.add(`${item.memberId}::${item.kind}`)
        })
        cache = merged
        writeLocal()
        primed = true
        emitChanged()
      }
    } catch {
      // offline / old deployment — keep the local cache
    } finally {
      priming = null
    }
  })()
  return priming
}

/**
 * React hook: a checker for "has this member been wished for this occasion?".
 * Primes from the backend on first mount and refreshes whenever a wish is sent
 * anywhere.
 * @returns {(memberId: string, occasion: WishOccasion) => boolean}
 */
export function useCompletedWishes(): (memberId: string, occasion: WishOccasion) => boolean {
  const [keys, setKeys] = useState<Set<string>>(cache)
  useEffect(() => {
    const refresh = () => setKeys(new Set(cache))
    window.addEventListener(CHANGED_EVENT, refresh)
    primeCompletedWishes()
    return () => window.removeEventListener(CHANGED_EVENT, refresh)
  }, [])
  return (memberId: string, occasion: WishOccasion) => keys.has(wishKey(memberId, occasion))
}
