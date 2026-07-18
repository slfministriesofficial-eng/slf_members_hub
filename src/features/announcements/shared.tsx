import { useEffect, useRef } from 'react'
import { Icon } from '../../components/ui/Icon'
import { TEMPLATES, type Template } from '../../templates/push/announcements'
import { sanitizeWhatsappMessage } from '../../templates/whatsapp'

// Shared composer pieces for the three announcement flows (quick push,
// schedule, WhatsApp) — one source for the template chips, link editor, and
// the confirm/success modals so the three pages never drift apart.

export const MAX_MESSAGE_LENGTH = 1000

export type LinkEntry = { label: string; url: string }

export function defaultLinkLabel(index: number): string {
  return index === 0 ? 'Join Here' : `Link ${index + 1}`
}

/**
 * The WhatsApp-formatted message: bold title, body, bold link headings.
 * `*word*` is WhatsApp's own bold markdown — rendered by WhatsApp itself.
 * @param title announcement title (bolded when present)
 * @param message body text
 * @param links optional link entries appended as labeled blocks
 * @returns the sanitized message exactly as WhatsApp will receive it
 */
export function buildWhatsappAnnouncement(title: string, message: string, links: LinkEntry[]): string {
  const validLinks = links.filter((l) => l.url.trim())
  const lines: string[] = []
  if (title.trim()) {
    lines.push(`*${title.trim()}*`, '')
  }
  lines.push(message.trim() || 'Your announcement message will appear here.')
  validLinks.forEach((l, i) => {
    const label = l.label.trim() || defaultLinkLabel(i)
    lines.push('', `*${label}:*`, l.url.trim())
  })
  return sanitizeWhatsappMessage(lines.join('\n'))
}

/** Consistent high-contrast input styling for all three composer pages. */
export const FIELD_CLASS =
  'w-full rounded-xl border border-hairline bg-surface px-3.5 py-3 text-[14px] text-heading shadow-card outline-none transition-all placeholder:text-slate focus:border-brass-deep focus:ring-2 focus:ring-brass/25'

export const LABEL_CLASS = 'mb-1.5 block text-[12px] font-bold text-heading'

/**
 * One numbered step of the composer — gives the form a clear top-to-bottom
 * flow ("1 Choose a template → 2 Write the message → …") instead of one flat
 * unstructured card. `accent` is the flow color for the step badge.
 */
export function StepSection({
  step,
  title,
  hint,
  accent,
  children,
}: {
  step: number
  title: string
  hint?: string
  accent: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-surface p-4 shadow-card md:p-5">
      <div className="mb-3.5 flex items-center gap-2.5">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold text-white ${accent}`}
        >
          {step}
        </span>
        <h2 className="text-[13.5px] font-bold text-heading">{title}</h2>
        {hint && <span className="text-[11px] text-faint">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

/**
 * Template starter chips with a visible selected state — same starters on
 * all three pages. `accent` colors the active chip in the flow's color.
 */
export function TemplateChips({
  selectedKey,
  accent,
  onApply,
}: {
  selectedKey: string | null
  accent: string
  onApply: (template: Template) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TEMPLATES.map((tpl) => (
        <button
          key={tpl.key}
          onClick={() => onApply(tpl)}
          className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
            selectedKey === tpl.key
              ? `text-white ${accent}`
              : 'border border-hairline bg-paper text-heading hover:bg-paper-2'
          }`}
        >
          {tpl.label}
        </button>
      ))}
    </div>
  )
}

// Source patterns (shared by detection, the checklist chips, and the preview
// highlighter) for "when is this happening" mentions in a message.
const DATE_RE_SRC = String.raw`\b(?:sun|mon|tues|wednes|thurs|fri|satur)day\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s*\d{1,2}(?:st|nd|rd|th)?)?\b|\btoday\b|\btomorrow\b|\btonight\b|\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b`
const TIME_RE_SRC = String.raw`\b\d{1,2}[:.]\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?|\b\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?)\b|\bnoon\b|\bmidnight\b`

/** First date-like mention in the text ("Sunday", "20 July", "18/07"), or null. */
export function extractDate(text: string): string | null {
  const m = new RegExp(DATE_RE_SRC, 'i').exec(text)
  return m ? m[0].trim() : null
}

/** First time-like mention in the text ("6:30 PM", "10 AM"), or null. */
export function extractTime(text: string): string | null {
  const m = new RegExp(TIME_RE_SRC, 'i').exec(text)
  return m ? m[0].trim() : null
}

/** Does the text mention a day/date? (weekday, month, today/tomorrow, 18/07 …) */
export function detectDate(text: string): boolean {
  return extractDate(text) !== null
}

/** Does the text mention a time? (6:30 PM, 10 AM, noon …) */
export function detectTime(text: string): boolean {
  return extractTime(text) !== null
}

/**
 * Renders message text with every date/time mention highlighted in gold, so
 * the admin can verify the WHEN details at a glance in the preview.
 */
export function HighlightWhen({ text }: { text: string }) {
  const re = new RegExp(`\\[date\\]|\\[time\\]|${TIME_RE_SRC}|${DATE_RE_SRC}`, 'gi')
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const isPlaceholder = match[0].startsWith('[')
    parts.push(
      <span
        key={match.index}
        className={
          isPlaceholder
            ? 'rounded-[4px] bg-tint-amber-bg px-0.5 font-bold text-tint-amber-fg'
            : 'rounded-[4px] bg-brass/25 px-0.5 font-bold text-brass-deep'
        }
      >
        {/* Placeholders render WITHOUT the [brackets] in the preview — the
            member never sees brackets, so the preview shouldn't either. */}
        {isPlaceholder ? match[0].slice(1, -1) : match[0]}
      </span>,
    )
    last = match.index + match[0].length
    if (match[0].length === 0) re.lastIndex++ // safety against zero-length loops
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}

/**
 * Every announcement must tell members WHEN — reject unfilled template
 * placeholders and messages with no detectable date or time, with a message
 * telling the admin exactly what to add.
 * @param text the message body about to be sent
 * @param requireWhen false for emergency notices, where date/time is optional
 * @returns an error string to show the admin, or null when the message is ok
 */
export function messageValidationError(text: string, requireWhen = true): string | null {
  if (/\[date\]|\[time\]|\[enter announcement details here\]/i.test(text)) {
    return 'Replace the [square-bracket] placeholders with the actual details before sending.'
  }
  if (!requireWhen) return null
  const missing: string[] = []
  if (!detectDate(text)) missing.push('date (e.g. Sunday, 20 July)')
  if (!detectTime(text)) missing.push('time (e.g. 6:30 PM)')
  if (missing.length > 0) {
    return `Please add the ${missing.join(' and the ')} to the message so members know when.`
  }
  return null
}

/**
 * Message text with [Date]/[Time] placeholders highlighted in amber and real
 * date/time mentions bolded in brass — used inside the MessageArea mirror.
 */
function HighlightMessage({ text }: { text: string }) {
  const re = new RegExp(
    `\\[date\\]|\\[time\\]|\\[enter announcement details here\\]|${TIME_RE_SRC}|${DATE_RE_SRC}`,
    'gi',
  )
  const parts: React.ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    const isPlaceholder = match[0].startsWith('[')
    parts.push(
      <strong
        key={match.index}
        className={
          isPlaceholder
            ? 'rounded-[4px] bg-tint-amber-bg px-0.5 font-bold text-tint-amber-fg'
            : 'font-bold text-brass-deep'
        }
      >
        {match[0]}
      </strong>,
    )
    last = match.index + match[0].length
    if (match[0].length === 0) re.lastIndex++
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}

/**
 * The announcement message box with in-place highlighting: a styled mirror
 * sits behind a transparent textarea, so the [Date]/[Time] placeholders show
 * amber-highlighted and real dates/times show bold — while typing works
 * exactly like a normal textarea. Auto-resizes to the content.
 */
export function MessageArea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  // Mirror + textarea MUST share font, size, padding and wrapping so the
  // styled text lines up exactly under the (invisible) real text.
  const sharedText = 'whitespace-pre-wrap px-3.5 py-3 text-[14px] leading-normal [overflow-wrap:anywhere]'

  return (
    <div className="relative">
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden rounded-xl border border-hairline bg-surface text-heading shadow-card ${sharedText}`}
      >
        <HighlightMessage text={value} />
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        placeholder={placeholder}
        className={`relative w-full resize-none overflow-hidden rounded-xl border border-transparent bg-transparent text-transparent caret-brass-deep outline-none transition-all placeholder:text-slate focus:border-brass-deep focus:ring-2 focus:ring-brass/25 ${sharedText}`}
      />
    </div>
  )
}

/**
 * Live "Date · Sunday / Time · 6:30 PM" chips under the message field — shows
 * the exact values the checker detected, so the admin can verify at a glance.
 */
export function DateTimeChecklist({ text }: { text: string }) {
  const hasPlaceholderDate = /\[date\]/i.test(text)
  const hasPlaceholderTime = /\[time\]/i.test(text)
  const dateValue = hasPlaceholderDate ? null : extractDate(text)
  const timeValue = hasPlaceholderTime ? null : extractTime(text)
  const items = [
    { label: 'date', value: dateValue },
    { label: 'time', value: timeValue },
  ]
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.label}
          className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
            item.value ? 'bg-status-regular-bg text-status-regular-fg' : 'bg-tint-amber-bg text-tint-amber-fg'
          }`}
        >
          <Icon name={item.value ? 'check' : 'clock'} className="icon !h-[10px] !w-[10px] shrink-0" />
          <span className="truncate">
            {item.value ? (
              <>
                {item.label === 'date' ? 'Date' : 'Time'} · {item.value}
              </>
            ) : (
              `Add ${item.label}`
            )}
          </span>
        </span>
      ))}
    </div>
  )
}

/** One info row inside the summary panel (icon + label + value). */
export function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-hairline py-2.5 text-[12px] last:border-b-0">
      <Icon name={icon} className="icon !h-[13px] !w-[13px] shrink-0 text-brass-deep" />
      <span className="text-slate">{label}</span>
      <span className="ml-auto text-right font-bold text-heading">{value}</span>
    </div>
  )
}

/** Multi-link editor (heading + URL per row, add/remove) shared by push + WhatsApp. */
export function LinksEditor({
  links,
  onChange,
}: {
  links: LinkEntry[]
  onChange: (links: LinkEntry[]) => void
}) {
  function updateLink(index: number, field: keyof LinkEntry, value: string) {
    onChange(links.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  return (
    <div>
      <div className="space-y-2.5">
        {links.map((l, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-paper p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <input
                value={l.label}
                onChange={(e) => updateLink(i, 'label', e.target.value)}
                placeholder={`Heading — e.g. ${defaultLinkLabel(i)}`}
                className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-[13px] font-bold text-heading outline-none transition-all placeholder:font-normal placeholder:text-slate focus:border-brass-deep focus:ring-2 focus:ring-brass/25"
              />
              {links.length > 1 && (
                <button
                  onClick={() => onChange(links.filter((_, idx) => idx !== i))}
                  aria-label="Remove link"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:text-status-alert-fg"
                >
                  <Icon name="x" className="icon !h-[13px] !w-[13px]" />
                </button>
              )}
            </div>
            <input
              value={l.url}
              onChange={(e) => updateLink(i, 'url', e.target.value)}
              placeholder="https://…"
              className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-[13px] text-heading outline-none transition-all placeholder:text-slate focus:border-brass-deep focus:ring-2 focus:ring-brass/25"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...links, { label: '', url: '' }])}
        className="mt-2.5 flex items-center gap-1.5 rounded-full border border-hairline bg-paper px-3.5 py-2 text-[12px] font-bold text-heading transition-colors hover:bg-paper-2"
      >
        <Icon name="plus" className="icon !h-[11px] !w-[11px]" />
        Add Link
      </button>
    </div>
  )
}

export function ConfirmSendModal({
  count,
  onCancel,
  onConfirm,
}: {
  count: number
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="motion-safe:animate-[scale-in_0.25s_ease-out_both] w-full max-w-[380px] rounded-[26px] bg-paper p-5 shadow-elev"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-paper-2">
          <Icon name="bell" className="icon !h-[19px] !w-[19px] text-brass-deep" />
        </span>
        <h3 className="font-display text-[16.5px] font-bold text-heading">
          Send this notification to {count} device{count === 1 ? '' : 's'}?
        </h3>
        <p className="mt-1.5 text-[13px] text-slate">
          It will appear instantly as a push notification on every device that has enabled church
          notifications.
        </p>
        <div className="mt-4 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-hairline bg-surface py-3 text-[13px] font-bold text-heading transition-colors hover:bg-paper-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-ink py-3 text-[13px] font-bold text-white transition-colors hover:bg-ink-deep"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export function SuccessModal({
  sentCount,
  onSendAnother,
  onSchedule,
  onDone,
}: {
  sentCount: number
  onSendAnother: () => void
  onSchedule: () => void
  onDone: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="motion-safe:animate-[scale-in_0.3s_ease-out_both] w-full max-w-[380px] rounded-[26px] bg-paper p-6 text-center shadow-elev">
        <span className="motion-safe:animate-[scale-in_0.4s_ease-out_both] mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-regular-bg">
          <Icon name="check" className="icon !h-[28px] !w-[28px] text-status-regular-fg" />
        </span>
        <h3 className="font-display text-[19px] font-bold text-heading">Notification Sent</h3>
        <p className="mt-1.5 text-[13px] text-slate">
          Delivered to {sentCount} device{sentCount === 1 ? '' : 's'}.
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            onClick={onSendAnother}
            className="flex items-center justify-center gap-1.5 rounded-full bg-ink py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-ink-deep"
          >
            <Icon name="megaphone" className="icon !h-[14px] !w-[14px]" />
            Send Another
          </button>
          <button
            onClick={onSchedule}
            className="flex items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface py-3 text-[13.5px] font-bold text-heading transition-colors hover:bg-paper-2"
          >
            <Icon name="cal-check" className="icon !h-[14px] !w-[14px]" />
            Schedule One Instead
          </button>
          <button
            onClick={onDone}
            className="flex items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface py-3 text-[13.5px] font-bold text-heading transition-colors hover:bg-paper-2"
          >
            <Icon name="home" className="icon !h-[14px] !w-[14px]" />
            Back to Announcements
          </button>
        </div>
      </div>
    </div>
  )
}
