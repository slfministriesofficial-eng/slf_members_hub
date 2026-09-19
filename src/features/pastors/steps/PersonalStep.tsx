import { FormField } from '../../../components/form/FormField'
import { FormSelect } from '../../../components/form/FormSelect'
import { ToggleField } from '../../../components/form/ToggleField'
import { BLOOD_GROUPS } from '../../members/types'
import type { PastorStepProps } from '../types'

/** Section 1 of the Pastors Fellowship form. */
export function PersonalStep({ data, setField, errors }: PastorStepProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Full Name"
          required
          error={errors?.fullName}
          value={data.fullName}
          onChange={(v) => setField('fullName', v)}
          placeholder="Pastor Samuel Prasad"
        />
        <FormField
          label="Preferred Name"
          error={errors?.preferredName}
          value={data.preferredName}
          onChange={(v) => setField('preferredName', v)}
          placeholder="Ps. Samuel"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Date of Birth"
          required
          type="date"
          value={data.dob}
          onChange={(v) => setField('dob', v)}
        />
        <FormSelect
          label="Blood Group"
          value={data.bloodGroup}
          onChange={(v) => setField('bloodGroup', v)}
          options={BLOOD_GROUPS}
        />
      </div>

      <ToggleField
        label="Gender"
        required
        options={['Male', 'Female']}
        value={data.gender}
        onChange={(v) => setField('gender', v as typeof data.gender)}
      />

      {/* The pastors form says "Widowed" where the member form says
          "Widow/Widower" — each wizard keeps its own paper form's wording so
          transcribing stays a straight copy. */}
      <ToggleField
        label="Marital Status"
        required
        options={['Single', 'Married', 'Widowed']}
        value={data.maritalStatus}
        onChange={(v) => setField('maritalStatus', v as typeof data.maritalStatus)}
      />

      {data.maritalStatus === 'Married' && (
        <FormField
          label="Spouse Name"
          error={errors?.spouseName}
          value={data.spouseName}
          onChange={(v) => setField('spouseName', v)}
          placeholder="Grace Prasad"
        />
      )}
    </>
  )
}
