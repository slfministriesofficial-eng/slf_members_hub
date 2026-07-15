import { DatePicker } from '../ui/DatePicker'

type FormFieldProps = {
  label: string
  required?: boolean
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
}

const FIELD_CLASSNAME =
  'w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate focus:border-ink'

export function FormField({
  label,
  required,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
}: FormFieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
        {label}
        {required && <span className="text-status-alert-fg"> *</span>}
      </span>
      {type === 'date' ? (
        <DatePicker value={value} onChange={onChange} placeholder={placeholder} className={FIELD_CLASSNAME} />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={FIELD_CLASSNAME}
        />
      )}
      {hint && <span className="mt-1 block text-[11px] text-slate">{hint}</span>}
    </label>
  )
}
