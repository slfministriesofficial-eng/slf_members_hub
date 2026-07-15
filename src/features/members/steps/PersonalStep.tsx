import { FormField } from '../../../components/form/FormField'
import { FormSelect } from '../../../components/form/FormSelect'
import { ToggleField } from '../../../components/form/ToggleField'
import { BLOOD_GROUPS, type StepProps } from '../types'

export function PersonalStep({ data, setField }: StepProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Full Name"
          required
          value={data.fullName}
          onChange={(v) => setField('fullName', v)}
          placeholder="Samuel Prasad"
        />
        <FormField
          label="Preferred Name"
          value={data.preferredName}
          onChange={(v) => setField('preferredName', v)}
          placeholder="Sam"
        />
      </div>

      <ToggleField
        label="Gender"
        required
        options={['Male', 'Female']}
        value={data.gender}
        onChange={(v) => setField('gender', v as typeof data.gender)}
      />

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
        label="Marital Status"
        required
        options={['Single', 'Married', 'Widow/Widower']}
        value={data.maritalStatus}
        onChange={(v) => setField('maritalStatus', v as typeof data.maritalStatus)}
      />

      {data.maritalStatus === 'Married' && (
        <FormField
          label="Marriage Day"
          type="date"
          value={data.marriageDay}
          onChange={(v) => setField('marriageDay', v)}
        />
      )}
    </>
  )
}
