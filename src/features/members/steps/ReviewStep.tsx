import type { ReactNode } from 'react'
import type { StepProps } from '../types'

type Tone = 'blue' | 'green' | 'purple' | 'amber' | 'pink' | 'slate'

const TONE_CLASSES: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: 'bg-tint-blue-bg', fg: 'text-tint-blue-fg' },
  green: { bg: 'bg-tint-green-bg', fg: 'text-tint-green-fg' },
  purple: { bg: 'bg-tint-purple-bg', fg: 'text-tint-purple-fg' },
  amber: { bg: 'bg-tint-amber-bg', fg: 'text-tint-amber-fg' },
  pink: { bg: 'bg-tint-pink-bg', fg: 'text-tint-pink-fg' },
  slate: { bg: 'bg-tint-slate-bg', fg: 'text-tint-slate-fg' },
}

function Row({ label, value }: { label: string; value?: string | number }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 py-1.5 text-[12.5px]">
      <span className="text-charcoal/70">{label}</span>
      <span className="text-right font-bold text-heading">{value}</span>
    </div>
  )
}

function Section({ title, tone, children }: { title: string; tone: Tone; children: ReactNode }) {
  const c = TONE_CLASSES[tone]
  return (
    <div className={`rounded-xl px-4 py-3.5 ${c.bg}`}>
      <div className={`mb-1 text-[10.5px] font-bold uppercase tracking-wide ${c.fg}`}>{title}</div>
      <div className="divide-y divide-black/[0.06]">{children}</div>
    </div>
  )
}

export function ReviewStep({ data, setField }: StepProps) {
  return (
    <>
      <p className="text-[12.5px] text-slate">
        Check the details below before saving. A Member ID and registration date will be
        assigned automatically.
      </p>

      <Section title="Personal" tone="blue">
        <Row label="Full Name" value={data.fullName} />
        <Row label="Preferred Name" value={data.preferredName} />
        <Row label="Gender" value={data.gender} />
        <Row label="Date of Birth" value={data.dob} />
        <Row label="Marital Status" value={data.maritalStatus} />
        <Row label="Marriage Day" value={data.marriageDay} />
        <Row label="Blood Group" value={data.bloodGroup} />
      </Section>

      <Section title="Contact & Address" tone="green">
        <Row label="Mobile" value={data.mobile} />
        <Row label="WhatsApp" value={data.whatsapp} />
        <Row label="Email" value={data.email} />
        <Row label="Address" value={data.address} />
      </Section>

      {(data.spouseName || data.children.length > 0) && (
        <Section title="Family" tone="purple">
          <Row label="Spouse Name" value={data.spouseName} />
          <Row label="Spouse DOB" value={data.spouseDob} />
          <Row label="Spouse Mobile" value={data.spouseMobile} />
          <Row label="Children" value={data.children.length ? `${data.children.length} added` : undefined} />
        </Section>
      )}

      <Section title="Fellowship" tone="amber">
        <Row label="First Time Visiting" value={data.firstTimeVisiting} />
        <Row label="Previous Church" value={data.previousChurch} />
        <Row label="Date of Joining" value={data.joiningDate} />
        <Row label="Baptized" value={data.baptized} />
        <Row label="Baptized Date" value={data.baptizedDate} />
        <Row label="Baptized By" value={data.baptizedBy} />
        <Row label="Believer (years)" value={data.believerYears} />
      </Section>

      <Section title="Ministry Interest" tone="pink">
        <Row
          label="Selected"
          value={data.ministryInterests.length ? data.ministryInterests.join(', ') : undefined}
        />
      </Section>

      <Section title="Occupation & Emergency Contact" tone="slate">
        <Row label="Occupation" value={data.occupation} />
        <Row label="Other Info" value={data.occupationOther} />
        <Row label="Emergency Contact" value={data.emergencyName} />
        <Row label="Relationship" value={data.emergencyRelationship} />
        <Row label="Emergency Mobile" value={data.emergencyMobile} />
      </Section>

      <label className="flex items-start gap-3 rounded-xl border border-hairline px-3.5 py-3.5">
        <input
          type="checkbox"
          checked={data.declarationConfirmed}
          onChange={(e) => setField('declarationConfirmed', e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
        />
        <span className="text-[12.5px] leading-relaxed text-charcoal">
          I confirm the signed physical registration form (with the member's declaration and
          signature) is on file, and the details above match it.
        </span>
      </label>
    </>
  )
}
