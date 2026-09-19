import { FormField } from '../../../components/form/FormField'
import { FormTextarea } from '../../../components/form/FormTextarea'
import type { PastorStepProps } from '../types'
import { keepDigits } from '../../../utils/validation'

/** Section 4 — the pastor's own church and ministry. */
export function MinistryStep({ data, setField, errors }: PastorStepProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Church Name"
          required
          value={data.churchName}
          onChange={(v) => setField('churchName', v)}
          placeholder="Bethel Prayer House"
        />
        <FormField
          label="Denomination"
          value={data.denomination}
          onChange={(v) => setField('denomination', v)}
          placeholder="Independent / Baptist / AG…"
        />
      </div>

      <FormTextarea
        label="Church Address"
        value={data.churchAddress}
        onChange={(v) => setField('churchAddress', v)}
        placeholder="Street, area, village / town"
        rows={2}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Current Ministry Position"
          value={data.currentPosition}
          onChange={(v) => setField('currentPosition', v)}
          placeholder="Senior Pastor"
        />
        <FormField
          label="Years of Ministry Experience"
          inputMode="numeric"
          sanitize={keepDigits}
          maxLength={2}
          error={errors?.yearsOfExperience}
          value={data.yearsOfExperience}
          onChange={(v) => setField('yearsOfExperience', v)}
          placeholder="12"
        />
      </div>

      <FormField
        label="Ministry Location"
        value={data.ministryLocation}
        onChange={(v) => setField('ministryLocation', v)}
        placeholder="Village / Town / District"
      />
    </>
  )
}
