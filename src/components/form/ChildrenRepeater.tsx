import { Icon } from '../ui/Icon'
import { DatePicker } from '../ui/DatePicker'
import type { ChildDraft } from '../../features/members/types'

type ChildrenRepeaterProps = {
  value: ChildDraft[]
  onChange: (value: ChildDraft[]) => void
}

export function ChildrenRepeater({ value, onChange }: ChildrenRepeaterProps) {
  function update(index: number, patch: Partial<ChildDraft>) {
    onChange(value.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...value, { name: '', dob: '' }])
  }

  return (
    <div>
      <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
        Children details
      </span>

      {value.map((child, i) => (
        <div key={i} className="mb-2.5 flex items-center gap-2">
          <span className="w-5 shrink-0 text-center font-mono text-[11px] text-slate">{i + 1}</span>
          <input
            value={child.name}
            onChange={(e) => update(i, { name: e.target.value })}
            placeholder="Child's name"
            className="flex-1 rounded-xl border border-hairline bg-paper px-3 py-2.5 text-[13px] text-heading outline-none focus:border-ink"
          />
          <div className="w-[140px] shrink-0">
            <DatePicker
              value={child.dob}
              onChange={(v) => update(i, { dob: v })}
              placeholder="DOB"
              className="rounded-xl border border-hairline bg-paper px-2.5 py-2.5 text-[13px] text-heading outline-none focus:border-ink"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            aria-label="Remove child"
            className="shrink-0 text-slate"
          >
            <Icon name="x" className="icon !h-[15px] !w-[15px]" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="mt-1 flex items-center gap-1.5 text-[12.5px] font-bold text-brass-deep"
      >
        <Icon name="plus" className="icon !h-[14px] !w-[14px]" />
        Add child
      </button>
    </div>
  )
}
