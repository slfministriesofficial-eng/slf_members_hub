import { useCallback, useSyncExternalStore } from 'react'

/**
 * Chrome/Edge fire this instead of showing their own install banner. It is
 * usable exactly once, and only from inside a user gesture.
 */
export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const SNOOZE_KEY = 'slf.install-prompt.snoozed-until'
const DISMISS_KEY = 'slf.install-prompt.dismiss-count'

/** Each "Not now" pushes the next ask further out, so someone who keeps saying
 *  no is never nagged again rather than being asked every week forever. */
const SNOOZE_DAYS = [7, 30, 365]

/** Already launched from the home screen / dock — never ask again. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari predates display-mode and reports it here instead.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iOS (incl. iPadOS 13+, which reports itself as a Mac with a touchscreen).
 *  No browser on iOS fires beforeinstallprompt, so these devices get manual
 *  Share → Add to Home Screen steps instead of a one-tap button. */
export function isIosDevice(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

type InstallSnapshot = {
  /** A native install prompt is captured and ready to fire. */
  canInstall: boolean
  installed: boolean
  /** Epoch ms before which the popup stays quiet. */
  snoozedUntil: number
  /** Opened by hand (e.g. from More → Install app), which ignores the snooze. */
  forced: boolean
}

let deferredEvent: BeforeInstallPromptEvent | null = null
let forced = false
const listeners = new Set<() => void>()

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    // Private mode / storage blocked — treat as "never dismissed".
    return 0
  }
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* non-blocking: worst case we ask again next visit */
  }
}

function compute(): InstallSnapshot {
  return {
    canInstall: deferredEvent !== null,
    installed: isStandalone(),
    snoozedUntil: readNumber(SNOOZE_KEY),
    forced,
  }
}

// useSyncExternalStore compares snapshots by identity, so this is rebuilt only
// when something actually changed — never inside getSnapshot.
let snapshot: InstallSnapshot = compute()

function publish() {
  snapshot = compute()
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Registered at module scope, not in an effect: beforeinstallprompt often fires
// before React has mounted, and an event missed is an install lost.
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault() // suppress Chrome's own mini-infobar; we show our own
  deferredEvent = event as BeforeInstallPromptEvent
  publish()
})

window.addEventListener('appinstalled', () => {
  deferredEvent = null
  forced = false
  writeNumber(SNOOZE_KEY, 0)
  writeNumber(DISMISS_KEY, 0)
  publish()
})

/** Open the popup on demand, bypassing any active snooze. */
export function openInstallPrompt() {
  forced = true
  publish()
}

export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribe, () => snapshot)

  const snooze = useCallback(() => {
    const count = readNumber(DISMISS_KEY) + 1
    const days = SNOOZE_DAYS[Math.min(count, SNOOZE_DAYS.length) - 1]
    writeNumber(DISMISS_KEY, count)
    writeNumber(SNOOZE_KEY, Date.now() + days * 86_400_000)
    forced = false
    publish()
  }, [])

  const dismiss = useCallback(() => {
    forced = false
    publish()
  }, [])

  /** Must be called straight from a click handler — Chrome rejects prompt()
   *  outside a user gesture. */
  const promptInstall = useCallback(async () => {
    const event = deferredEvent
    if (!event) return 'unavailable' as const
    // The event is single-use; drop it up front so a double-tap can't call
    // prompt() twice on a spent event (which throws).
    deferredEvent = null
    forced = false
    publish()
    try {
      await event.prompt()
      const { outcome } = await event.userChoice
      return outcome
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error)
      return 'unavailable' as const
    }
  }, [])

  return { ...state, snooze, dismiss, promptInstall }
}
