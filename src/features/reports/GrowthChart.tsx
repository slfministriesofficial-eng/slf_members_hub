import { useId, useMemo, useRef, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { addedInWindow, growthPercent, type GrowthPoint } from './growth'

/**
 * Chart hues. The app's own palette is deliberately muted — navy reads as gray
 * at chart-mark size and fails the chroma floor — so these are stepped for the
 * job. Both modes validated against the card surface (#FFFFFF / #1B2130):
 * lightness band, chroma floor, CVD separation, normal-vision separation and
 * 3:1 contrast all pass.
 */
export type ChartAccent = 'blue' | 'brass'

const ACCENT_CLASS: Record<ChartAccent, string> = {
  blue: '[--c:#2a78d6] dark:[--c:#3987e5]',
  brass: '[--c:#B8863A] dark:[--c:#BE8A2C]',
}

// Plot geometry. The SVG scales to its container; strokes are pinned to real
// pixels with vector-effect so a wide chart doesn't get a fat line.
const VB_W = 600
const VB_H = 200
const PAD_T = 12
const PAD_B = 22
const PAD_L = 30
const PAD_R = 8

/**
 * Single-series growth chart — how a register grew, month by month.
 *
 * One series per chart on purpose: members and pastors are different registers
 * of very different size, and putting them on one plot would need two y-scales.
 * Two charts, one scale each, is the honest version.
 *
 * Hover (or touch-drag) anywhere on the plot snaps a crosshair to the nearest
 * month and shows that month's real recorded figures.
 *
 * @param {object} props title, the monthly series, and which accent to wear
 */
export function GrowthChart({
  title,
  subject,
  points,
  accent,
  isLoading,
  isError,
  emptyHint,
}: {
  title: string
  /** Plural noun for the tooltip and summary, e.g. "members". */
  subject: string
  points: GrowthPoint[]
  accent: ChartAccent
  isLoading?: boolean
  isError?: boolean
  emptyHint: string
}) {
  const gradientId = useId()
  const plotRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const maxTotal = Math.max(1, ...points.map((p) => p.total))
  // Head-room so the line never touches the top edge.
  const scaleMax = Math.ceil((maxTotal * 1.1) / 5) * 5 || 5

  const coords = useMemo(
    () =>
      points.map((p, i) => {
        const x =
          points.length === 1
            ? PAD_L + (VB_W - PAD_L - PAD_R) / 2
            : PAD_L + (i / (points.length - 1)) * (VB_W - PAD_L - PAD_R)
        const y = PAD_T + (1 - p.total / scaleMax) * (VB_H - PAD_T - PAD_B)
        return { x, y }
      }),
    [points, scaleMax],
  )

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(' ')
  const areaPath =
    coords.length > 0
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(2)},${VB_H - PAD_B} L${coords[0].x.toFixed(2)},${VB_H - PAD_B} Z`
      : ''

  const pct = growthPercent(points)
  const added = addedInWindow(points)
  const latest = points.length > 0 ? points[points.length - 1] : null
  const active = hover !== null ? points[hover] : null
  const activeCoord = hover !== null ? coords[hover] : null

  /** Nearest month to the pointer — the whole plot is the hit target, not the
   *  8px dots, so this works with a finger as well as a mouse. */
  function pick(clientX: number) {
    const svg = plotRef.current
    if (!svg || points.length === 0) return
    const box = svg.getBoundingClientRect()
    const ratio = (clientX - box.left) / box.width
    const vbX = ratio * VB_W
    let best = 0
    let bestDist = Infinity
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - vbX)
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    setHover(best)
  }

  // Roughly six ticks, whatever the window length.
  const tickEvery = Math.max(1, Math.ceil(points.length / 6))

  return (
    <Card className={`p-4 md:p-5 ${ACCENT_CLASS[accent]}`}>
      <div className="mb-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[13px] font-bold text-heading">{title}</h2>
          <p className="mt-0.5 text-[11px] text-slate">
            {points.length > 0
              ? `${points[0].label} – ${points[points.length - 1].label}`
              : 'No records yet'}
          </p>
        </div>
        {latest && (
          <div className="shrink-0 text-right">
            <div className="font-display text-[24px] font-bold leading-none text-heading">
              {latest.total}
            </div>
            <div className="mt-0.5 text-[10px] text-slate">total {subject}</div>
          </div>
        )}
      </div>

      {/* Growth headline. A percentage needs a non-zero starting point, so when
          the register began inside this window we state the count instead. */}
      {points.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              added > 0 ? 'bg-status-regular-bg text-status-regular-fg' : 'bg-paper-2 text-slate'
            }`}
          >
            {added > 0 && <Icon name="chart" className="icon !h-[11px] !w-[11px]" />}
            {pct !== null ? `${pct >= 0 ? '+' : ''}${pct}%` : `+${added}`}
          </span>
          <span className="text-[11px] text-slate">
            {added > 0
              ? `${added} new ${subject} since ${points[0].label}`
              : `no new ${subject} since ${points[0].label}`}
          </span>
        </div>
      )}

      {isLoading && <div className="skeleton h-44 w-full rounded-xl" />}

      {isError && (
        <p className="py-10 text-center text-[12px] text-slate">
          Could not load this register — check your connection.
        </p>
      )}

      {!isLoading && !isError && points.length === 0 && (
        <p className="py-10 text-center text-[12px] text-slate">{emptyHint}</p>
      )}

      {!isLoading && !isError && points.length > 0 && (
        <>
          <div className="relative">
            <svg
              ref={plotRef}
              viewBox={`0 0 ${VB_W} ${VB_H}`}
              className="h-44 w-full touch-pan-y md:h-56"
              role="img"
              aria-label={`${title}: ${latest?.total ?? 0} ${subject} as of ${latest?.longLabel ?? ''}`}
              onPointerMove={(e) => pick(e.clientX)}
              onPointerDown={(e) => pick(e.clientX)}
              onPointerLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--c)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--c)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Recessive gridlines + y labels */}
              {[0, 0.5, 1].map((t) => {
                const y = PAD_T + t * (VB_H - PAD_T - PAD_B)
                const value = Math.round(scaleMax * (1 - t))
                return (
                  <g key={t}>
                    <line
                      x1={PAD_L}
                      y1={y}
                      x2={VB_W - PAD_R}
                      y2={y}
                      className="stroke-hairline"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      x={PAD_L - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-faint text-[9px] font-semibold"
                    >
                      {value}
                    </text>
                  </g>
                )
              })}

              <path d={areaPath} fill={`url(#${gradientId})`} />
              <path
                d={linePath}
                fill="none"
                stroke="var(--c)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* x ticks */}
              {points.map((p, i) =>
                i % tickEvery === 0 || i === points.length - 1 ? (
                  <text
                    key={p.month}
                    x={coords[i].x}
                    y={VB_H - 6}
                    textAnchor="middle"
                    className="fill-faint text-[9px] font-semibold"
                  >
                    {p.label}
                  </text>
                ) : null,
              )}

              {/* Crosshair + marker. The ring is the surface colour so the dot
                  stays legible wherever the line sits. */}
              {activeCoord && (
                <g pointerEvents="none">
                  <line
                    x1={activeCoord.x}
                    y1={PAD_T}
                    x2={activeCoord.x}
                    y2={VB_H - PAD_B}
                    stroke="var(--c)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={activeCoord.x} cy={activeCoord.y} r="6" fill="var(--c)" />
                  <circle
                    cx={activeCoord.x}
                    cy={activeCoord.y}
                    r="6"
                    fill="none"
                    className="stroke-surface"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              )}
            </svg>

            {/* Tooltip — real recorded figures for the hovered month. */}
            {active && activeCoord && (
              <div
                className="pointer-events-none absolute top-1 z-10 w-max max-w-[62%] -translate-x-1/2 rounded-lg bg-ink-deep px-2.5 py-1.5 shadow-elev"
                style={{
                  left: `${Math.min(88, Math.max(12, (activeCoord.x / VB_W) * 100))}%`,
                }}
              >
                <div className="text-[10px] font-semibold text-white/70">{active.longLabel}</div>
                <div className="text-[12.5px] font-bold text-white">
                  {active.total} {subject}
                </div>
                <div className="text-[10px] text-white/70">
                  {active.added > 0 ? `+${active.added} registered this month` : 'none registered'}
                </div>
              </div>
            )}
          </div>

          {/* Table view — the same numbers without relying on the plot. */}
          <button
            onClick={() => setShowTable((v) => !v)}
            className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate hover:text-heading"
          >
            <Icon
              name="chevron"
              className={`icon !h-[12px] !w-[12px] transition-transform ${showTable ? 'rotate-90' : ''}`}
            />
            {showTable ? 'Hide data' : 'Show data'}
          </button>

          {showTable && (
            <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-hairline">
              <table className="w-full text-left text-[11.5px]">
                <thead className="sticky top-0 bg-paper text-[10px] uppercase tracking-wide text-slate">
                  <tr>
                    <th className="px-3 py-1.5 font-bold">Month</th>
                    <th className="px-3 py-1.5 text-right font-bold">New</th>
                    <th className="px-3 py-1.5 text-right font-bold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...points].reverse().map((p) => (
                    <tr key={p.month} className="border-t border-hairline">
                      <td className="px-3 py-1.5 text-charcoal">{p.longLabel}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate">
                        {p.added > 0 ? `+${p.added}` : '—'}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-heading">{p.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
