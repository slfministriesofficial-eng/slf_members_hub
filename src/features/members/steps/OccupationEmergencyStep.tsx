import { FormField } from '../../../components/form/FormField'
import { FormTextarea } from '../../../components/form/FormTextarea'
import type { StepProps } from '../types'

export function OccupationEmergencyStep({ data, setField }: StepProps) {
  return (
    <>
      <FormField
        label="Occupation"
        value={data.occupation}
        onChange={(v) => setField('occupation', v)}
        placeholder="e.g. Teacher, Software Engineer"
      />
      <FormTextarea
        label="Other Information"
        value={data.occupationOther}
        onChange={(v) => setField('occupationOther', v)}
        rows={2}
      />

      <div className="mt-2 border-t border-hairline pt-4">
        <span className="mb-3 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
          Emergency Contact
        </span>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Name"
            required
            value={data.emergencyName}
            onChange={(v) => setField('emergencyName', v)}
          />
          <FormField
            label="Relationship"
            value={data.emergencyRelationship}
            onChange={(v) => setField('emergencyRelationship', v)}
            placeholder="e.g. Father, Sibling"
          />
        </div>
        <FormField
          label="Mobile"
          required
          type="tel"
          value={data.emergencyMobile}
          onChange={(v) => setField('emergencyMobile', v)}
          placeholder="90000 12345"
        />
      </div>
    </>
  )
}
