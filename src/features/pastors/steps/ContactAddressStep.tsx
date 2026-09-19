import { FormField } from '../../../components/form/FormField'
import { FormTextarea } from '../../../components/form/FormTextarea'
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
          onChange={(v) => setField('mobile', v)}
          placeholder="98765 43210"
        />
        <FormField
          label="WhatsApp Number"
          type="tel"
          inputMode="tel"
          sanitize={keepPhoneChars}
          error={errors?.whatsapp}
          value={data.whatsapp}
          onChange={(v) => setField('whatsapp', v)}
          placeholder="Same as mobile if blank"
          hint="Leave blank to use the mobile number"
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
