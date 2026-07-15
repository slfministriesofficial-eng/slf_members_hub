import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

export type DropdownOption = { value: string; label: ReactNode }

type DropdownProps = {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  triggerClassName?: string
  panelClassName?: string
  align?: 'left' | 'right'
}

// A native <select>'s open option list is drawn by the OS/browser, not by our
// CSS, so it can never pick up the app's design no matter how the closed
// control is styled. This renders its own floating panel instead — same
// trigger/value contract as a <select>, but every pixel of it is ours.
export function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  triggerClassName = '',
  panelClassName = '',
  align = 'left',
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

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

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 ${triggerClassName}`}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {selected ? selected.label : <span className="text-slate">{placeholder}</span>}
        </span>
        <Icon
          name="chevron"
          className={`icon !h-[13px] !w-[13px] shrink-0 text-slate transition-transform duration-200 ${
            open ? '-rotate-90' : 'rotate-90'
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute top-full z-30 mt-1.5 max-h-64 min-w-full overflow-y-auto rounded-2xl bg-surface p-1.5 shadow-elev ring-1 ring-hairline ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${panelClassName}`}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                opt.value === value ? 'bg-brass/15 text-brass-deep' : 'text-heading hover:bg-paper'
              }`}
            >
              {opt.label}
              {opt.value === value && (
                <Icon name="check" className="icon !h-[13px] !w-[13px] shrink-0 text-brass-deep" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
