import { parseDate } from '../../utils/celebrations'

export type GrowthPoint = {
  /** 'YYYY-MM' */
  month: string
  /** 'Mar 26' — the x-axis tick */
  label: string
  /** 'March 2026' — the tooltip heading */
  longLabel: string
  /** Registered during this month. */
  added: number
  /** Register size at the end of this month. */
  total: number
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthFromKey(key: string): Date {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

/**
 * A continuous month-by-month view of how a register grew.
 *
 * Every month in the window gets a point even when nobody registered in it —
 * a gap would otherwise make a flat stretch look like missing data, and would
 * space the x-axis unevenly.
 *
 * Anyone registered BEFORE the window starts is carried in as the opening
 * total, so the line shows the register's real size rather than restarting
 * from zero.
 *
 * @param {(string | undefined)[]} dates registration dates, any parseable form
 * @param {Date} now the month the window ends on
 * @param {number} months how many months to show, including the current one
 * @returns {GrowthPoint[]} oldest first
 */
export function buildGrowthSeries(dates: (string | undefined)[], now: Date, months = 12): GrowthPoint[] {
  const parsed = dates.map((d) => parseDate(d)).filter((d): d is Date => d !== null)

  const windowStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

  // Everyone already on the register when the window opens.
  let running = parsed.filter((d) => d < windowStart).length

  const addedByMonth = new Map<string, number>()
  parsed
    .filter((d) => d >= windowStart)
    .forEach((d) => {
      const key = monthKey(d)
      addedByMonth.set(key, (addedByMonth.get(key) ?? 0) + 1)
    })

  const points: GrowthPoint[] = []
  for (let i = 0; i < months; i++) {
    const date = new Date(windowStart.getFullYear(), windowStart.getMonth() + i, 1)
    const key = monthKey(date)
    const added = addedByMonth.get(key) ?? 0
    running += added
    points.push({
      month: key,
      label: date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      longLabel: date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      added,
      total: running,
    })
  }
  return points
}

/**
 * Percentage change across the window.
 * Growth from zero has no meaningful percentage — every first registration is
 * an infinite increase — so that case returns null and the caller shows the
 * raw count instead of a nonsense figure.
 * @param {GrowthPoint[]} points the series
 * @returns {number | null} percent change, or null when it can't be expressed
 */
export function growthPercent(points: GrowthPoint[]): number | null {
  if (points.length < 2) return null
  const first = points[0].total
  const last = points[points.length - 1].total
  if (first === 0) return null
  return Math.round(((last - first) / first) * 100)
}

/** Total registered within the window (excludes the opening balance). */
export function addedInWindow(points: GrowthPoint[]): number {
  return points.reduce((sum, p) => sum + p.added, 0)
}

/** The key month keys back as a Date — used for range labels. */
export { monthFromKey }
