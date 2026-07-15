import { Icon } from '../ui/Icon'

type ChipMultiSelectProps = {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
}

export function ChipMultiSelect({ options, value, onChange }: ChipMultiSelectProps) {
  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option])
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
      {options.map((option) => {
        const active = value.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left text-[13px] font-semibold transition-colors ${
              active ? 'border-ink bg-ink text-white' : 'border-hairline bg-surface text-charcoal'
            }`}
          >
            {option}
            {active && <Icon name="check" className="icon !h-[14px] !w-[14px] shrink-0" />}
          </button>
        )
      })}
    </div>
  )
}
