import { FormField } from '../../../components/form/FormField'
import { ChildrenRepeater } from '../../../components/form/ChildrenRepeater'
import type { StepProps } from '../types'
import { keepPhoneChars } from '../../../utils/validation'

export function FamilyStep({ data, setField, errors }: StepProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Spouse Name"
          required={data.maritalStatus === 'Married'}
          error={errors?.spouseName}
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
        inputMode="tel"
        sanitize={keepPhoneChars}
        error={errors?.spouseMobile}
        value={data.spouseMobile}
        onChange={(v) => setField('spouseMobile', v)}
        placeholder="90000 54321"
      />

      <ChildrenRepeater value={data.children} onChange={(v) => setField('children', v)} />
    </>
  )
}
