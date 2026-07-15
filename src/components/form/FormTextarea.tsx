type FormTextareaProps = {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function FormTextarea({
  label,
  required,
  value,
  onChange,
  placeholder,
  rows = 3,
}: FormTextareaProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
        {label}
        {required && <span className="text-status-alert-fg"> *</span>}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className="w-full resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate focus:border-ink"
      />
    </label>
  )
}
