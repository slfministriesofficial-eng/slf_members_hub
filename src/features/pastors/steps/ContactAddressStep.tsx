import { FormField } from '../../../components/form/FormField'
import { FormTextarea } from '../../../components/form/FormTextarea'
import { SameAsMobileCheck } from '../../../components/form/SameAsMobileCheck'
import type { PastorStepProps } from '../types'
import { keepDigits, keepPhoneChars } from '../../../utils/validation'

/** Sections 2 and 3 — contact details and the residential address. */
export function ContactAddressStep({ data, setField, errors }: PastorStepProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Mobile Number"
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
          placeholder="98765 43210"
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
          placeholder="98765 43210"
          hint="Leave blank to use the mobile number"
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
        label="Email ID"
        type="email"
        inputMode="email"
        error={errors?.email}
        value={data.email}
        onChange={(v) => setField('email', v)}
        placeholder="pastor@example.com"
        hint="Optional"
      />

      <FormTextarea
        label="Residential Address"
        value={data.address}
        onChange={(v) => setField('address', v)}
        placeholder="House no., street, area"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Village / Town / City"
          value={data.villageTownCity}
          onChange={(v) => setField('villageTownCity', v)}
          placeholder="Tadigadapa"
        />
        <FormField
          label="District"
          value={data.district}
          onChange={(v) => setField('district', v)}
          placeholder="Krishna"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="State"
          value={data.state}
          onChange={(v) => setField('state', v)}
          placeholder="Andhra Pradesh"
        />
        <FormField
          label="PIN Code"
          inputMode="numeric"
          sanitize={keepDigits}
          maxLength={6}
          error={errors?.pinCode}
          value={data.pinCode}
          onChange={(v) => setField('pinCode', v)}
          placeholder="521137"
        />
      </div>
    </>
  )
}
