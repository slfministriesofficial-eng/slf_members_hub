import logo from '../../assets/slf_logo_cropped.png'
import { Icon } from '../../components/ui/Icon'
import type { MemberStatus } from '../../components/ui/StatusPill'
import { toTitleCase } from '../../utils/initials'
import { QrCode } from './QrCode'

type IdCardProps = {
  name: string
  memberId: string
  mobile?: string
  bloodGroup?: string
  status: MemberStatus
  statusLabel: string
  sinceYear?: string
  // Omits the mobile stat badge — used on the public digital profile page,
  // where the phone number must not be shown. Everywhere else, leave unset.
  hideMobile?: boolean
}

const STATUS_DOT: Record<MemberStatus, string> = {
  regular: '#3F9142',
  visitor: '#3E6E8E',
  leader: '#B8863A',
  alert: '#B1503F',
  inactive: '#8A93A0',
}

// Reused both as a live preview while filling the registration wizard
// (fed from the in-progress draft) and on a saved member's profile
// (fed from their real record) — same component, different data source.
export function IdCard({
  name,
  memberId,
  mobile,
  bloodGroup,
  status,
  statusLabel,
  sinceYear,
  hideMobile,
}: IdCardProps) {
  // Same Member ID, same URL, every time — the QR never needs regenerating,
  // even if the member's other details change later.
  const profileUrl = `${window.location.origin}/member?id=${encodeURIComponent(memberId)}`
  return (
    <div className="relative aspect-[8/5] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-white via-[#FBF8F1] to-[#F1EAD8]">
      {/* faint watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
        <Icon name="cross" className="icon !h-36 !w-36 text-ink" />
      </div>

      <div className="relative flex h-full flex-col px-5 pt-3.5">
        {/* header: logo · wordmark · QR */}
        <div className="flex items-start justify-between gap-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full shadow-md ring-[3px] ring-brass/70">
            <img src={logo} alt="" className="h-full w-full object-cover" />
          </div>

          <div className="min-w-0 flex-1 pt-0.5 text-center">
            <div className="mb-0.5 flex items-center justify-center gap-2 text-brass-deep">
              <span className="h-px w-8 bg-brass-deep/40" />
              <Icon name="cross" className="icon !h-[12px] !w-[12px] text-brass-deep" />
              <span className="h-px w-8 bg-brass-deep/40" />
            </div>
            {/* data-gold-text: the PDF export flattens this gradient-clipped
                wordmark to a solid gold in html2canvas's onclone — background-clip:
                text can't be captured, so on-screen it's a gradient, in the PDF
                it's solid gold (see MembershipCardsScreen downloadCardPdf). */}
            <div
              data-gold-text
              className="bg-gradient-to-b from-[#F6E3A8] via-[#D4A94C] to-[#8E6526] bg-clip-text font-display text-[26px] font-black leading-none text-transparent"
            >
              SARAH
            </div>
            <div className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-ink">
              Living Faith Ministries
            </div>
            <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wide text-brass-deep">
              <span className="h-1 w-1 rounded-full bg-brass-deep" />
              Vijayawada
              <span className="h-1 w-1 rounded-full bg-brass-deep" />
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1 rounded-xl border-2 border-brass/70 bg-white p-1.5 shadow-md">
            <QrCode value={profileUrl} className="h-[84px] w-[84px]" />
            <span className="text-[7.5px] font-bold uppercase tracking-wide text-slate">Scan to verify</span>
          </div>
        </div>

        {/* name + status */}
        <div className="mt-3">
          <div className="truncate font-display text-[23px] font-black uppercase leading-none text-ink">
            {toTitleCase(name) || 'New Member'}
          </div>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-brass/40 bg-ink-deep px-3 py-1 text-[9px] font-bold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[status] }} />
            {statusLabel}
          </span>
          {sinceYear && <div className="mt-1.5 text-[9.5px] italic text-slate">Member since {sinceYear}</div>}
        </div>

        <div className="flex-1" />

        {/* bottom navy band */}
        <div className="relative -mx-5 mt-3 overflow-hidden rounded-t-[32px] bg-gradient-to-br from-ink-deep to-ink px-5 pb-3.5 pt-3.5">
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(212,169,76,0.6) 1px, transparent 1px)',
              backgroundSize: '10px 10px',
            }}
          />
          <div className={`relative grid divide-x divide-white/15 ${hideMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <StatBadge icon="id" label="Member ID" value={memberId} mono />
            {!hideMobile && <StatBadge icon="phone" label="Mobile" value={mobile || '—'} />}
            <StatBadge icon="heart" label="Blood Group" value={bloodGroup || '—'} />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBadge({
  icon,
  label,
  value,
  mono,
}: {
  icon: string
  label: string
  value: string
  mono?: boolean
}) {
  // Horizontal: text (label over value) on the LEFT, icon on the RIGHT.
  return (
    <div className="flex items-center justify-between gap-2 px-2.5">
      <div className="min-w-0">
        <div className="text-[8px] font-bold uppercase tracking-wide text-brass">{label}</div>
        <div className={`truncate text-[13px] font-bold text-white ${mono ? 'font-mono tracking-wide' : ''}`}>
          {value}
        </div>
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brass/60">
        <Icon name={icon} className="icon !h-[14px] !w-[14px] text-brass" />
      </span>
    </div>
  )
}
