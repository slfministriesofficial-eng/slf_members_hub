import { FormField } from '../../../components/form/FormField'
import { FormTextarea } from '../../../components/form/FormTextarea'
import type { StepProps } from '../types'

export function ContactStep({ data, setField }: StepProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Mobile"
          required
          type="tel"
          value={data.mobile}
          onChange={(v) => setField('mobile', v)}
          placeholder="90000 12345"
        />
        <FormField
          label="WhatsApp Number"
          type="tel"
          value={data.whatsapp}
          onChange={(v) => setField('whatsapp', v)}
          placeholder="Same as mobile, if different"
        />
      </div>

      <FormField
        label="Email Id"
        type="email"
        value={data.email}
        onChange={(v) => setField('email', v)}
        placeholder="name@example.com"
        hint="Optional"
      />

      <FormTextarea
        label="Residential Address"
        required
        value={data.address}
        onChange={(v) => setField('address', v)}
        placeholder="House / street / area / city"
        rows={3}
      />
    </>
  )
}
