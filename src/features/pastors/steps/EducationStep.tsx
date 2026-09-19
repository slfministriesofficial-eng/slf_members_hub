import { FormField } from '../../../components/form/FormField'
import { FormTextarea } from '../../../components/form/FormTextarea'
import type { PastorStepProps } from '../types'
import { keepDigits } from '../../../utils/validation'

/** Section 5 — theological education and training. Entirely optional on the
 *  paper form, so this step is skippable in the wizard. */
export function EducationStep({ data, setField, errors }: PastorStepProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Theological Training"
          value={data.theologicalTraining}
          onChange={(v) => setField('theologicalTraining', v)}
          placeholder="B.Th / M.Div / Bible school…"
        />
        <FormField
          label="Institution Name"
          value={data.institutionName}
          onChange={(v) => setField('institutionName', v)}
          placeholder="Serampore College"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Degree / Diploma Earned"
          value={data.degreeEarned}
          onChange={(v) => setField('degreeEarned', v)}
          placeholder="Bachelor of Theology"
        />
        <FormField
          label="Year of Graduation"
          inputMode="numeric"
          sanitize={keepDigits}
          maxLength={4}
          error={errors?.graduationYear}
          value={data.graduationYear}
          onChange={(v) => setField('graduationYear', v)}
          placeholder="2014"
        />
      </div>

      <FormTextarea
        label="Other Ministry Training / Certifications"
        value={data.otherTraining}
        onChange={(v) => setField('otherTraining', v)}
        placeholder="Counselling course, leadership training, certifications…"
        rows={2}
      />
    </>
  )
}
