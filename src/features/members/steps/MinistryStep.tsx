import { ChipMultiSelect } from '../../../components/form/ChipMultiSelect'
import { MINISTRY_OPTIONS, type StepProps } from '../types'

export function MinistryStep({ data, setField }: StepProps) {
  return (
    <div>
      <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
        Ministry Participation / Interest
      </span>
      <p className="mb-3 text-[12.5px] text-slate">Select any that apply — this is optional.</p>
      <ChipMultiSelect
        options={MINISTRY_OPTIONS}
        value={data.ministryInterests}
        onChange={(v) => setField('ministryInterests', v)}
      />
    </div>
  )
}
