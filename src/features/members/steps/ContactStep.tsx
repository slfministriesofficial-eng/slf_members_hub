import { FormField } from '../../../components/form/FormField'
import { FormTextarea } from '../../../components/form/FormTextarea'
import { SameAsMobileCheck } from '../../../components/form/SameAsMobileCheck'
import type { StepProps } from '../types'
import { keepPhoneChars } from '../../../utils/validation'

export function ContactStep({ data, setField, errors }: StepProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Mobile"
          required
          type="tel"
          inputMode="tel"
          sanitize={keepPhoneChars}
          error={errors?.mobile}
          value={data.mobile}
          onChange={(v) => {
            setField('mobile', v)
            // Keep the mirrored number in step while the tick is on.
            if (data.whatsappSameAsMobile) setField('whatsapp', v)
          }}
          placeholder="90000 12345"
        />
        <FormField
          label="WhatsApp Number"
          type="tel"
          inputMode="tel"
          sanitize={keepPhoneChars}
          error={errors?.whatsapp}
          disabled={data.whatsappSameAsMobile}
          value={data.whatsappSameAsMobile ? data.mobile : data.whatsapp}
          onChange={(v) => setField('whatsapp', v)}
          placeholder="90000 12345"
          labelAction={
            <SameAsMobileCheck
              checked={data.whatsappSameAsMobile}
              onChange={(next) => {
                setField('whatsappSameAsMobile', next)
                if (next) setField('whatsapp', data.mobile)
              }}
            />
          }
        />
      </div>

      <FormField
        label="Email Id"
        type="email"
        inputMode="email"
        error={errors?.email}
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
