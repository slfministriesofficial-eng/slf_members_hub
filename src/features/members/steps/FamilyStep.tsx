import { FormField } from '../../../components/form/FormField'
import { ChildrenRepeater } from '../../../components/form/ChildrenRepeater'
import type { StepProps } from '../types'

export function FamilyStep({ data, setField }: StepProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Spouse Name"
          required
          value={data.spouseName}
          onChange={(v) => setField('spouseName', v)}
          placeholder="Grace Prasad"
        />
        <FormField
          label="Spouse Date of Birth"
          type="date"
          value={data.spouseDob}
          onChange={(v) => setField('spouseDob', v)}
        />
      </div>

      <FormField
        label="Spouse Mobile"
        type="tel"
        value={data.spouseMobile}
        onChange={(v) => setField('spouseMobile', v)}
        placeholder="90000 54321"
      />

      <ChildrenRepeater value={data.children} onChange={(v) => setField('children', v)} />
    </>
  )
}
