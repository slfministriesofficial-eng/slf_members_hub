// "Completed" (wish already sent this visit) used to live as local component
// state, which worked fine for a modal but breaks once sending a wish
// navigates to its own page — going back would remount the list screen and
// lose the Set entirely. Backed by sessionStorage instead so it survives
// that navigation, while still resetting on a real page reload/new session,
// consistent with "no backend field for this" from the start.
const STORAGE_KEY = 'slf-completed-wishes'

function readIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

export function getCompletedIds(): Set<string> {
  return readIds()
}

export function markCompleted(memberId: string): Set<string> {
  const ids = readIds()
  ids.add(memberId)
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  // Literal event name (not imported from useAlertCounts) to avoid a module
  // cycle — keeps nav badges in sync the moment a wish is sent.
  window.dispatchEvent(new Event('slf-alerts-changed'))
  return ids
}
