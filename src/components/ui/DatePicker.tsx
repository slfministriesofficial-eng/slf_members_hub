import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { Dropdown } from './Dropdown'

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const YEARS_PAST = 110
const YEARS_FUTURE = 1

function parseDateValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, y, mo, d] = match
  const date = new Date(Number(y), Number(mo) - 1, Number(d))
  return Number.isNaN(date.getTime()) ? null : date
}

function toDateValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(date: Date): string {
  return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getFullYear()}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Weeks always start Sunday and always fill complete rows — leading/trailing
// cells borrow days from the neighboring months so the grid never jumps size.
function getMonthGrid(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const startWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false })
  }
  return cells
}

// Custom calendar — replaces the native <input type="date"> popup, which (like
// a <select> option list) is drawn by the OS/browser and can't be restyled.
// Keeps the same 'YYYY-MM-DD' string value/onChange contract as the native
// input, so call sites don't need to change how dates are stored.
export function DatePicker({ value, onChange, placeholder = 'Select date', className = '' }: DatePickerProps) {
  const selectedDate = parseDateValue(value)
  const today = new Date()
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState((selectedDate ?? today).getFullYear())
  const [viewMonth, setViewMonth] = useState((selectedDate ?? today).getMonth())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const anchor = selectedDate ?? today
    setViewYear(anchor.getFullYear())
    setViewMonth(anchor.getMonth())
  }, [open])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const monthOptions = MONTH_NAMES.map((name, i) => ({ value: String(i), label: name }))
  const yearOptions = Array.from({ length: YEARS_PAST + YEARS_FUTURE + 1 }, (_, i) => {
    const year = today.getFullYear() + YEARS_FUTURE - i
    return { value: String(year), label: String(year) }
  })

  const cells = getMonthGrid(viewYear, viewMonth)

  function selectDate(date: Date) {
    onChange(toDateValue(date))
    setOpen(false)
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={selectedDate ? '' : 'text-slate'}>
          {selectedDate ? formatDisplay(selectedDate) : placeholder}
        </span>
        <Icon name="cal-check" className="icon !h-[16px] !w-[16px] shrink-0 text-slate" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-[280px] rounded-2xl bg-surface p-3 shadow-elev ring-1 ring-hairline">
          <div className="mb-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate hover:bg-paper"
            >
              <Icon name="chevron" className="icon !h-[13px] !w-[13px] rotate-180" />
            </button>

            <div className="flex flex-1 items-center gap-1">
              <Dropdown
                value={String(viewMonth)}
                onChange={(v) => setViewMonth(Number(v))}
                options={monthOptions}
                triggerClassName="flex-1 rounded-lg px-2 py-1.5 text-[12.5px] font-bold text-heading hover:bg-paper"
                panelClassName="max-h-52"
              />
              <Dropdown
                value={String(viewYear)}
                onChange={(v) => setViewYear(Number(v))}
                options={yearOptions}
                triggerClassName="w-[76px] rounded-lg px-2 py-1.5 text-[12.5px] font-bold text-heading hover:bg-paper"
                panelClassName="max-h-52"
              />
            </div>

            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate hover:bg-paper"
            >
              <Icon name="chevron" className="icon !h-[13px] !w-[13px]" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className="text-[10px] font-bold uppercase tracking-wide text-slate">
                {label}
              </span>
            ))}
            {cells.map(({ date, inMonth }, i) => {
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isToday = isSameDay(date, today)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!inMonth}
                  onClick={() => selectDate(date)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold transition-colors ${
                    !inMonth
                      ? 'pointer-events-none text-faint opacity-40'
                      : isSelected
                        ? 'bg-brass text-ink-deep'
                        : isToday
                          ? 'text-brass-deep ring-1 ring-inset ring-brass/50 hover:bg-paper'
                          : 'text-heading hover:bg-paper'
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-hairline pt-2.5">
            <button type="button" onClick={() => selectDate(today)} className="text-[12px] font-bold text-brass-deep">
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="text-[12px] font-bold text-slate"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
