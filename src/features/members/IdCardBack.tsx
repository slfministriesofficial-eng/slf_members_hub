import { Icon } from '../../components/ui/Icon'
import { CHURCH_INFO } from '../../constants/church'

// Static organization-info side of the membership card — no per-member data,
// so unlike IdCard (front) this takes no props.
export function IdCardBack() {
  const founder = CHURCH_INFO.leadership[0]
  return (
    <div className="relative aspect-[8/5] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-white via-[#FBF8F1] to-[#F1EAD8] shadow-elev">
      {/* corner wave accents — kept small and pushed outside the card so they
          read as a folded-corner ribbon instead of covering the content grid */}
      <div className="pointer-events-none absolute -left-24 -top-28 h-32 w-32 rotate-45 rounded-[42%] bg-gradient-to-br from-ink-deep to-ink" />
      <div className="pointer-events-none absolute -left-24 -top-28 h-32 w-32 rotate-45 rounded-[42%] ring-4 ring-brass/60" />
      <div className="pointer-events-none absolute -right-24 -bottom-28 h-32 w-32 rotate-45 rounded-[42%] bg-gradient-to-br from-ink-deep to-ink" />
      <div className="pointer-events-none absolute -right-24 -bottom-28 h-32 w-32 rotate-45 rounded-[42%] ring-4 ring-brass/60" />

      {/* watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]">
        <Icon name="cross" className="icon !h-40 !w-40 text-ink" />
      </div>

      <div className="relative grid h-full grid-cols-[1fr_auto_1fr] gap-4 px-5 py-4">
        {/* left: org identity + contact */}
        <div className="flex h-full min-w-0 flex-col gap-2">
          <div>
            <div className="mb-0.5 flex items-center gap-1.5 text-brass-deep">
              <span className="h-px w-6 bg-brass-deep/40" />
              <Icon name="cross" className="icon !h-[10px] !w-[10px] text-brass-deep" />
              <span className="h-px w-6 bg-brass-deep/40" />
            </div>
            <div className="font-display text-[13px] font-black uppercase leading-tight text-ink">
              {CHURCH_INFO.name}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[7.5px] font-bold uppercase tracking-wide text-brass-deep">
              <span className="h-1 w-1 rounded-full bg-brass-deep" />
              {CHURCH_INFO.city}
              <span className="h-1 w-1 rounded-full bg-brass-deep" />
            </div>
          </div>

          <div className="inline-flex w-fit items-center rounded-full bg-ink-deep px-2.5 py-1 text-[6.5px] font-bold uppercase tracking-wide text-brass">
            {CHURCH_INFO.tagline}
          </div>

          <div className="flex flex-col">
            <ContactRow icon="pin" lines={CHURCH_INFO.addressLines} />
            <ContactRow icon="phone" lines={[CHURCH_INFO.phone]} />
            <ContactRow icon="mail" lines={[CHURCH_INFO.email]} />
            <ContactRow icon="globe" lines={[CHURCH_INFO.website]} last />
          </div>
        </div>

        {/* vertical divider */}
        <div className="h-full w-px bg-brass/25" />

        {/* right: notes + signature/seal */}
        <div className="flex h-full min-w-0 flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ink-deep px-3 py-1 text-[7.5px] font-bold uppercase tracking-wide text-brass">
            Important Notes
          </div>
          <ul className="flex flex-col gap-1.5 text-[7px] leading-snug text-ink">
            <li className="border-b border-brass/15 pb-1.5">
              This membership card is the property of Sarah Living Faith Ministries.
            </li>
            <li className="border-b border-brass/15 pb-1.5">This card is non-transferable.</li>
            <li className="border-b border-brass/15 pb-1.5">If found, kindly return it to the church office.</li>
            <li>Carry this card during church programs and events.</li>
          </ul>

          <div className="mt-auto flex items-end justify-between gap-2">
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-display text-[16px] italic text-ink">V. Narayana Rao</span>
              <span className="h-px w-14 bg-brass/40" />
              <span className="text-[5.5px] font-bold uppercase tracking-wide text-brass-deep">Founder Signature</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-ink">
                <img src={founder.photo} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="text-[5.5px] font-bold uppercase tracking-wide text-brass-deep">Founder</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContactRow({ icon, lines, last }: { icon: string; lines: string[]; last?: boolean }) {
  return (
    <div className={`flex items-start gap-2 py-1.5 ${last ? '' : 'border-b border-brass/15'}`}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-deep text-brass">
        <Icon name={icon} className="icon !h-[10px] !w-[10px]" />
      </span>
      <div className="min-w-0 pt-0.5">
        {lines.map((line, i) => (
          <div key={i} className="truncate text-[7px] font-semibold leading-snug text-ink">
            {line}
          </div>
        ))}
      </div>
    </div>
  )
}
