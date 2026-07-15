type SegmentedControlProps = {
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  return (
    <div className="mb-4 flex rounded-2xl bg-surface p-1 shadow-card">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`flex-1 rounded-xl px-2 py-2.5 text-[12px] font-bold font-body transition-colors ${
            option === value ? 'bg-ink text-white' : 'text-slate'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
