import { SegmentedControl } from '../ui/SegmentedControl'

type ToggleFieldProps = {
  label: string
  required?: boolean
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function ToggleField({ label, required, options, value, onChange }: ToggleFieldProps) {
  return (
    <div>
      <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
        {label}
        {required && <span className="text-status-alert-fg"> *</span>}
      </span>
      <SegmentedControl options={options} value={value} onChange={onChange} />
    </div>
  )
}
