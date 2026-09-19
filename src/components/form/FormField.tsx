import type { ReactNode } from 'react'
import { DatePicker } from '../ui/DatePicker'

type FormFieldProps = {
  label: string
  required?: boolean
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  /** Validation message to show under the field, in red. */
  error?: string
  /**
   * Runs on every keystroke before the value is stored — used to keep letters
   * out of phone/PIN/year boxes entirely, rather than only complaining about
   * them once the step is submitted.
   */
  sanitize?: (value: string) => string
  /** Phone keypad on mobile for numeric fields. */
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  maxLength?: number
  disabled?: boolean
  /** Rendered to the right of the label — e.g. the "same as mobile" tick. */
  labelAction?: ReactNode
}

const FIELD_CLASSNAME =
  'w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate/55 focus:border-ink'

const ERROR_CLASSNAME =
  'w-full rounded-xl border border-status-alert-fg bg-status-alert-bg px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate/55 focus:border-status-alert-fg'

export function FormField({
  label,
  required,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
  error,
  sanitize,
  inputMode,
  maxLength,
  disabled,
  labelAction,
}: FormFieldProps) {
  const fieldClass = error ? ERROR_CLASSNAME : FIELD_CLASSNAME

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-[11.5px] font-bold uppercase tracking-wide text-slate">
        <span>
          {label}
          {required && <span className="text-status-alert-fg"> *</span>}
        </span>
        {labelAction}
      </span>
      {type === 'date' ? (
        <DatePicker value={value} onChange={onChange} placeholder={placeholder} className={fieldClass} />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(sanitize ? sanitize(e.target.value) : e.target.value)}
          placeholder={placeholder}
          required={required}
          inputMode={inputMode}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          className={`${fieldClass} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        />
      )}
      {error ? (
        <span className="mt-1 block text-[11px] font-semibold text-status-alert-fg">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-[11px] text-slate">{hint}</span>
      )}
    </label>
  )
}
