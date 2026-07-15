import { FormField } from '../../../components/form/FormField'
import { ToggleField } from '../../../components/form/ToggleField'
import type { StepProps } from '../types'

export function FellowshipStep({ data, setField }: StepProps) {
  return (
    <>
      <ToggleField
        label="First Time Visiting Church"
        required
        options={['Yes', 'No']}
        value={data.firstTimeVisiting}
        onChange={(v) => setField('firstTimeVisiting', v as typeof data.firstTimeVisiting)}
      />

      {data.firstTimeVisiting === 'No' && (
        <FormField
          label="Previous Church (if any)"
          value={data.previousChurch}
          onChange={(v) => setField('previousChurch', v)}
          placeholder="Name of previous church"
        />
      )}

      <FormField
        label="Date of Joining"
        type="date"
        value={data.joiningDate}
        onChange={(v) => setField('joiningDate', v)}
        hint="When they joined this church"
      />

      <ToggleField
        label="Baptized"
        required
        options={['Yes', 'No']}
        value={data.baptized}
        onChange={(v) => setField('baptized', v as typeof data.baptized)}
      />

      {data.baptized === 'Yes' && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Baptized Date / Year"
              type="date"
              value={data.baptizedDate}
              onChange={(v) => setField('baptizedDate', v)}
            />
            <FormField
              label="Believer (in years)"
              type="number"
              value={data.believerYears}
              onChange={(v) => setField('believerYears', v)}
              placeholder="e.g. 8"
            />
          </div>
          <FormField
            label="Baptized By"
            value={data.baptizedBy}
            onChange={(v) => setField('baptizedBy', v)}
            placeholder="Name of pastor/minister"
          />
        </>
      )}
    </>
  )
}
