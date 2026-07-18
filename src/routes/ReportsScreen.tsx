import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../components/ui/Card'
import { Icon } from '../components/ui/Icon'
import { Dropdown } from '../components/ui/Dropdown'
import { Skeleton } from '../components/ui/Skeleton'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { MobileBackButton } from '../components/ui/MobileBackButton'
import { useMembers } from '../features/members/MembersContext'
import { fetchAttendanceSummary, type AttendanceSummaryItem } from '../attendance/api'

type Metric = 'count' | 'rate'

/** "12 Jul" from yyyy-MM-dd. */
function shortDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/** "Sunday, 12 July 2026" for tooltips. */
function longDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function monthLabel(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00`)
  if (isNaN(d.getTime())) return ym
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Reports & Insights — attendance analytics built entirely from the recorded
 * attendance history (the backend keeps ~2 months). One measure at a time
 * (attendance count OR rate), one accent hue, so it reads cleanly and stays
 * colorblind-safe. No fabricated figures: everything traces to real records.
 */
export function ReportsScreen() {
  const { members } = useMembers()
  const totalMembers = members.length

  const [month, setMonth] = useState('all')
  const [metric, setMetric] = useState<Metric>('count')

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: fetchAttendanceSummary,
  })

  const monthOptions = useMemo(() => {
    const months = new Set((summary ?? []).map((r) => r.date.slice(0, 7)))
    const opts = [...months].sort((a, b) => (a < b ? 1 : -1)).map((m) => ({ value: m, label: monthLabel(m) }))
    return [{ value: 'all', label: 'All months' }, ...opts]
  }, [summary])

  // Chronological (oldest → newest) for the trend, filtered by the chosen month.
  const series = useMemo(() => {
    let rows = summary ?? []
    if (month !== 'all') rows = rows.filter((r) => r.date.startsWith(month))
    return [...rows].sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [summary, month])

  const stats = useMemo(() => computeStats(series, totalMembers), [series, totalMembers])

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <div className="mb-1 flex items-center gap-1">
        <MobileBackButton />
        <h1 className="font-display text-[20px] font-bold text-heading md:text-[24px]">Reports &amp; Insights</h1>
      </div>
      <p className="mb-4 text-[12.5px] text-slate">Attendance analytics from the last two months of records.</p>

      {/* FILTERS — one row above the charts */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Dropdown
          value={month}
          onChange={setMonth}
          options={monthOptions}
          triggerClassName="rounded-full bg-surface py-2 pl-3.5 pr-2 text-[12px] font-semibold text-heading shadow-card"
        />
        <SegmentedControl
          options={['Attendance', 'Rate']}
          value={metric === 'count' ? 'Attendance' : 'Rate'}
          onChange={(v) => setMetric(v === 'Rate' ? 'rate' : 'count')}
        />
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {isError && (
        <Card className="p-6 text-center">
          <p className="text-[12.5px] text-slate">
            Could not load attendance data — deploy the latest Apps Script version, then reload.
          </p>
        </Card>
      )}

      {summary && series.length === 0 && (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-paper-2">
            <Icon name="chart" className="icon !h-[24px] !w-[24px] text-faint" />
          </span>
          <h3 className="font-display text-[15px] font-bold text-heading">No attendance recorded yet</h3>
          <p className="max-w-[280px] text-[12.5px] text-slate">
            Mark attendance on a few Sundays and the trends and insights will appear here.
          </p>
        </Card>
      )}

      {summary && series.length > 0 && (
        <div className="space-y-5">
          {/* KPI TILES */}
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <StatTile icon="users" label="Total Members" value={String(totalMembers)} />
            <StatTile icon="cal-check" label="Avg Attendance" value={String(stats.avg)} />
            <StatTile
              icon="check"
              label="Highest"
              value={String(stats.highest)}
              sub={stats.highestDate ? shortDate(stats.highestDate) : undefined}
              tone="regular"
            />
            <StatTile
              icon="chart"
              label="Avg Rate"
              value={totalMembers ? `${stats.avgRate}%` : '—'}
              tone="brass"
            />
          </div>

          {/* TREND CHART */}
          <TrendChart series={series} totalMembers={totalMembers} metric={metric} />

          {/* SERVICE BREAKDOWN — doubles as the accessible table view */}
          <ServiceBreakdown series={series} totalMembers={totalMembers} />
        </div>
      )}
    </div>
  )
}

type Stats = {
  avg: number
  highest: number
  highestDate: string | null
  avgRate: number
}

function computeStats(series: AttendanceSummaryItem[], total: number): Stats {
  if (series.length === 0) return { avg: 0, highest: 0, highestDate: null, avgRate: 0 }
  const counts = series.map((s) => s.count)
  const sum = counts.reduce((a, b) => a + b, 0)
  const avg = Math.round(sum / series.length)
  let highest = 0
  let highestDate: string | null = null
  series.forEach((s) => {
    if (s.count > highest) {
      highest = s.count
      highestDate = s.date
    }
  })
  const avgRate = total ? Math.round((avg / total) * 100) : 0
  return { avg, highest, highestDate, avgRate }
}

function StatTile({
  icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon: string
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'regular' | 'brass'
}) {
  const iconClass =
    tone === 'regular' ? 'text-status-regular-fg' : tone === 'brass' ? 'text-brass-deep' : 'text-heading'
  return (
    <Card className="p-3.5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon name={icon} className={`icon !h-[13px] !w-[13px] ${iconClass}`} />
        <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate">{label}</span>
      </div>
      <div className="font-display text-[22px] font-bold leading-none text-heading">{value}</div>
      {sub && <div className="mt-1 text-[10.5px] text-slate">{sub}</div>}
    </Card>
  )
}

/**
 * Single-series column chart (attendance count or rate over recorded dates).
 * Div-based bars — responsive, scrollable when many dates — with a per-bar
 * hover tooltip. One accent hue; recessive baseline; direct value on hover.
 */
function TrendChart({
  series,
  totalMembers,
  metric,
}: {
  series: AttendanceSummaryItem[]
  totalMembers: number
  metric: Metric
}) {
  const [hover, setHover] = useState<number | null>(null)

  const values = series.map((s) => (metric === 'rate' && totalMembers ? Math.round((s.count / totalMembers) * 100) : s.count))
  const max = metric === 'rate' ? 100 : Math.max(1, ...values)
  const unit = metric === 'rate' ? '%' : ''
  const axisTop = metric === 'rate' ? '100%' : String(max)

  return (
    <Card className="p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[13px] font-bold text-heading">
          {metric === 'rate' ? 'Attendance Rate' : 'Attendance'} by Service
        </h2>
        <span className="text-[11px] text-slate">{series.length} service{series.length === 1 ? '' : 's'}</span>
      </div>

      <div className="flex gap-3">
        {/* y-axis reference labels */}
        <div className="flex w-6 shrink-0 flex-col justify-between py-1 text-right text-[9px] font-semibold text-faint">
          <span>{axisTop}</span>
          <span>{metric === 'rate' ? '50%' : Math.round(max / 2)}</span>
          <span>0</span>
        </div>

        {/* plot */}
        <div className="min-w-0 flex-1">
          <div className="relative">
            {/* recessive gridlines */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              <span className="h-px w-full bg-hairline" />
              <span className="h-px w-full bg-hairline" />
              <span className="h-px w-full bg-hairline" />
            </div>

            <div className="relative flex h-48 items-end gap-1.5 overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {series.map((s, i) => {
                const v = values[i]
                const pct = Math.max(2, (v / max) * 100)
                const active = hover === i
                return (
                  <button
                    key={s.date}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    className="group relative flex h-full min-w-[26px] flex-1 flex-col justify-end"
                    aria-label={`${longDate(s.date)}: ${v}${unit}`}
                  >
                    {active && (
                      <div className="pointer-events-none absolute -top-1 left-1/2 z-10 w-max -translate-x-1/2 -translate-y-full rounded-lg bg-ink-deep px-2.5 py-1.5 text-center shadow-elev">
                        <div className="text-[10px] font-semibold text-white/70">{longDate(s.date)}</div>
                        <div className="text-[12px] font-bold text-white">
                          {s.count} present{totalMembers ? ` · ${Math.round((s.count / totalMembers) * 100)}%` : ''}
                        </div>
                      </div>
                    )}
                    <div
                      className={`w-full rounded-t-[4px] bg-gradient-to-b from-brass to-brass-deep transition-[height,opacity] ${
                        active ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          {/* x-axis labels */}
          <div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {series.map((s) => (
              <span key={s.date} className="min-w-[26px] flex-1 text-center text-[9px] font-semibold text-slate">
                {shortDate(s.date)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

/** Per-service rows with a rate bar — the readable, table-like companion view. */
function ServiceBreakdown({ series, totalMembers }: { series: AttendanceSummaryItem[]; totalMembers: number }) {
  // Newest first for reading.
  const rows = [...series].sort((a, b) => (a.date < b.date ? 1 : -1))
  return (
    <Card className="p-4 md:p-5">
      <h2 className="mb-3 text-[13px] font-bold text-heading">Service Breakdown</h2>
      <div className="space-y-3">
        {rows.map((s) => {
          const rate = totalMembers ? Math.round((s.count / totalMembers) * 100) : 0
          return (
            <div key={s.date} className="flex items-center gap-3">
              <div className="w-20 shrink-0 text-[11.5px] font-semibold text-heading">{shortDate(s.date)}</div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brass to-brass-deep"
                  style={{ width: `${totalMembers ? Math.max(3, rate) : 0}%` }}
                />
              </div>
              <div className="w-24 shrink-0 text-right text-[11.5px] text-slate">
                <span className="font-bold text-heading">{s.count}</span>
                {totalMembers ? ` · ${rate}%` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
