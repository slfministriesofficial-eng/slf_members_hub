import type { ReactNode } from 'react'
import type { PastorStepProps } from '../types'

type Tone = 'blue' | 'green' | 'purple' | 'amber' | 'pink' | 'slate'

const TONE_CLASSES: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: 'bg-tint-blue-bg', fg: 'text-tint-blue-fg' },
  green: { bg: 'bg-tint-green-bg', fg: 'text-tint-green-fg' },
  purple: { bg: 'bg-tint-purple-bg', fg: 'text-tint-purple-fg' },
  amber: { bg: 'bg-tint-amber-bg', fg: 'text-tint-amber-fg' },
  pink: { bg: 'bg-tint-pink-bg', fg: 'text-tint-pink-fg' },
  slate: { bg: 'bg-tint-slate-bg', fg: 'text-tint-slate-fg' },
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 py-1.5 text-[12.5px]">
      <span className="shrink-0 text-charcoal/70">{label}</span>
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

export function ReviewStep({ data, setField }: PastorStepProps) {
  const fullAddress = [data.address, data.villageTownCity, data.district, data.state, data.pinCode]
    .filter(Boolean)
    .join(', ')

  return (
    <>
      <p className="text-[12.5px] text-slate">
        Check the details below before saving. A Pastor ID and registration date are assigned
        automatically, and the registration starts as <strong className="text-heading">Pending</strong> until
        the office verifies it.
      </p>

      <Section title="Personal" tone="blue">
        <Row label="Full Name" value={data.fullName} />
        <Row label="Preferred Name" value={data.preferredName} />
        <Row label="Date of Birth" value={data.dob} />
        <Row label="Gender" value={data.gender} />
        <Row label="Marital Status" value={data.maritalStatus} />
        <Row label="Spouse Name" value={data.maritalStatus === 'Married' ? data.spouseName : ''} />
        <Row label="Blood Group" value={data.bloodGroup} />
      </Section>

      <Section title="Contact & Address" tone="green">
        <Row label="Mobile" value={data.mobile} />
        <Row label="WhatsApp" value={data.whatsapp || data.mobile} />
        <Row label="Email" value={data.email} />
        <Row label="Address" value={fullAddress} />
      </Section>

      <Section title="Church & Ministry" tone="amber">
        <Row label="Church Name" value={data.churchName} />
        <Row label="Denomination" value={data.denomination} />
        <Row label="Church Address" value={data.churchAddress} />
        <Row label="Position" value={data.currentPosition} />
        <Row label="Experience (years)" value={data.yearsOfExperience} />
        <Row label="Ministry Location" value={data.ministryLocation} />
      </Section>

      <Section title="Theological Education" tone="purple">
        <Row label="Training" value={data.theologicalTraining} />
        <Row label="Institution" value={data.institutionName} />
        <Row label="Degree / Diploma" value={data.degreeEarned} />
        <Row label="Year of Graduation" value={data.graduationYear} />
        <Row label="Other Training" value={data.otherTraining} />
      </Section>

      <Section title="Fellowship" tone="pink">
        <Row label="Reason to join" value={data.reasonToJoin} />
        <Row label="How they heard" value={data.howHeard} />
      </Section>

      <Section title="References" tone="slate">
        <Row label="Reference 1" value={data.ref1Name} />
        <Row label="Contact" value={data.ref1Phone} />
        <Row label="Reference 2" value={data.ref2Name} />
        <Row label="Contact" value={data.ref2Phone} />
      </Section>

      <label className="flex items-start gap-3 rounded-xl border border-hairline px-3.5 py-3.5">
        <input
          type="checkbox"
          checked={data.declarationConfirmed}
          onChange={(e) => setField('declarationConfirmed', e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
        />
        <span className="text-[12.5px] leading-relaxed text-charcoal">
          I confirm the signed physical Pastors Fellowship registration form (with the declaration,
          photograph and signature) is on file, and the details above match it.
        </span>
      </label>
    </>
  )
}
