import { FormField } from '../../../components/form/FormField'
import { FormTextarea } from '../../../components/form/FormTextarea'
import { Icon } from '../../../components/ui/Icon'
import type { PastorStepProps } from '../types'

/** Sections 6 and 7 — why they want to join, and their two church-leader
 *  references. */
export function FellowshipStep({ data, setField }: PastorStepProps) {
  return (
    <>
      <FormTextarea
        label="Why do you want to join this fellowship?"
        value={data.reasonToJoin}
        onChange={(v) => setField('reasonToJoin', v)}
        placeholder="In their own words, as written on the form"
        rows={4}
      />

      <FormTextarea
        label="How did you hear about SLF Ministries Pastors Fellowship?"
        value={data.howHeard}
        onChange={(v) => setField('howHeard', v)}
        placeholder="Another pastor, a service, social media…"
        rows={2}
      />

      <div className="rounded-xl border border-hairline bg-paper px-3.5 py-3">
        <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-slate">
          <Icon name="lock-small" className="icon !h-[13px] !w-[13px] mt-0.5 shrink-0 text-brass-deep" />
          {/* These two people never filled in a form themselves — their details
              are kept for the office alone and are not shown outside it. */}
          Reference contacts are stored for office verification only and are never shown on any shared
          or public page.
        </p>
      </div>

      <div className="rounded-xl bg-tint-slate-bg px-4 py-3.5">
        <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-tint-slate-fg">
          Reference 1 — Church Leader
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Name"
            value={data.ref1Name}
            onChange={(v) => setField('ref1Name', v)}
            placeholder="Pastor John Babu"
          />
          <FormField
            label="Contact Number"
            type="tel"
            value={data.ref1Phone}
            onChange={(v) => setField('ref1Phone', v)}
            placeholder="98765 43210"
          />
        </div>
      </div>

      <div className="rounded-xl bg-tint-slate-bg px-4 py-3.5">
        <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-tint-slate-fg">
          Reference 2 — Church Leader
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Name"
            value={data.ref2Name}
            onChange={(v) => setField('ref2Name', v)}
            placeholder="Pastor David Raju"
          />
          <FormField
            label="Contact Number"
            type="tel"
            value={data.ref2Phone}
            onChange={(v) => setField('ref2Phone', v)}
            placeholder="98765 43210"
          />
        </div>
      </div>
    </>
  )
}
