import { Dropdown } from '../ui/Dropdown'

type FormSelectProps = {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
}

export function FormSelect({ label, required, value, onChange, options, placeholder }: FormSelectProps) {
  return (
    <div>
      <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
        {label}
        {required && <span className="text-status-alert-fg"> *</span>}
      </span>
      <Dropdown
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? 'Select…'}
        options={options.map((opt) => ({ value: opt, label: opt }))}
        triggerClassName="w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors focus:border-ink"
      />
    </div>
  )
}
