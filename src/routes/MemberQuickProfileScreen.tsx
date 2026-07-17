import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Avatar } from '../components/ui/Avatar'
import { useMembers } from '../features/members/MembersContext'
import { calculateAge, calculateYearsMarried, dateParts } from '../utils/celebrations'
import { NotificationStatusBell } from '../notifications/NotificationStatusBell'

type ProfileType = 'birthday' | 'anniversary' | 'new-member' | 'attendance'

const TYPE_META: Record<
  ProfileType,
  { title: string; icon: string; accent: string; wishKind: string; wishLabel: string; backTo: string }
> = {
  birthday: {
    title: 'Birthday Details',
    icon: 'cake',
    accent: 'text-tint-amber-fg',
    wishKind: 'birthday',
    wishLabel: 'Send Birthday Wish',
    backTo: '/birthdays/birthdays',
  },
  anniversary: {
    title: 'Anniversary Details',
    icon: 'rings',
    accent: 'text-tint-pink-fg',
    wishKind: 'anniversary',
    wishLabel: 'Send Anniversary Wish',
    backTo: '/birthdays/anniversaries',
  },
  'new-member': {
    title: 'Member Details',
    icon: 'heart',
    accent: 'text-brass-deep',
    wishKind: 'welcome',
    wishLabel: 'Send Welcome Message',
    backTo: '/follow-ups',
  },
  attendance: {
    title: 'Member Details',
    icon: 'cal-check',
    accent: 'text-brass-deep',
    wishKind: 'custom',
    wishLabel: 'Send Message',
    backTo: '/attendance',
  },
}

// A focused, read-only profile card for the birthdays/anniversaries/new-member
// flows — "View Profile" from those lists opens this instead of jumping into
// the full Member Profile page's edit/delete/attendance tooling. One
// component, reused for all three, since the fields shown never change.
export function MemberQuickProfileScreen() {
  const { type: rawType, memberId } = useParams<{ type: string; memberId: string }>()
  const type: ProfileType =
    rawType === 'anniversary' || rawType === 'new-member' || rawType === 'attendance' ? rawType : 'birthday'
  const navigate = useNavigate()
  const { getMember } = useMembers()
  const member = memberId ? getMember(memberId) : undefined
  const meta = TYPE_META[type]

  if (!member) {
    return (
      <div className="pb-10">
        <ProfileHeader title={meta.title} icon={meta.icon} accent={meta.accent} onClose={() => navigate(meta.backTo)} />
        <Card className="p-8 text-center">
          <p className="text-[12.5px] text-slate">Member not found.</p>
        </Card>
      </div>
    )
  }

  const dateSource = type === 'anniversary' ? member.anniversary : type === 'birthday' ? member.dob : member.joiningDateRaw
  const parsedDate = dateSource ? new Date(dateSource) : null
  const { day, month } = parsedDate && !Number.isNaN(parsedDate.getTime()) ? dateParts(parsedDate) : { day: '—', month: '—' }

  const subLabel =
    type === 'birthday'
      ? formatCount(calculateAge(member.dob), 'Years')
      : type === 'anniversary'
        ? formatCount(calculateYearsMarried(member.anniversary), 'Years Married')
        : undefined

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <ProfileHeader title={meta.title} icon={meta.icon} accent={meta.accent} onClose={() => navigate(meta.backTo)} />

      <Card className="mb-4 p-4">
        <div className="flex items-start gap-3">
          <Avatar initials={member.initials} color={member.color} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-bold text-heading">{member.name}</span>
              <span
                className="flex h-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[9px] font-bold text-white"
                style={{ backgroundColor: member.color }}
              >
                {member.initials}
              </span>
              <NotificationStatusBell memberId={member.memberId} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate">
              <span>{member.memberId}</span>
              {subLabel && (
                <>
                  <span className="h-1 w-1 rounded-full bg-faint" />
                  <span className="font-body">{subLabel}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border border-hairline bg-paper px-1.5 py-1.5">
            <span className="font-display text-[15px] font-bold leading-none text-heading">{day}</span>
            <span className="mt-0.5 text-[8.5px] font-bold uppercase tracking-wide text-slate">{month}</span>
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-4">
        <h2 className="mb-2 text-[13px] font-bold text-heading">Personal Details</h2>
        <DetailRow label="Full Name" value={member.name} />
        <DetailRow label="Preferred Name" value={member.preferredName} />
        <DetailRow label="Date of Birth" value={formatDate(member.dob)} />
        <DetailRow label="Gender" value={member.gender} />
        <DetailRow label="Marital Status" value={member.maritalStatus} />
        <DetailRow label="Ministry / Group" value={member.ministry !== '—' ? member.ministry : undefined} />
        <DetailRow label="Phone" value={member.phone} />
        <DetailRow label="WhatsApp" value={member.whatsapp} />
        <DetailRow label="Email" value={member.email} />
        <DetailRow label="Address" value={member.address} last />
      </Card>

      <h2 className="mb-2 text-[13px] font-bold text-heading">Actions</h2>
      <div className="space-y-2">
        <button
          onClick={() => navigate(`/send-wish/${meta.wishKind}/${member.id}`)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#25D366] py-3.5 text-[13.5px] font-bold text-white shadow-card transition-colors hover:bg-[#1FAF57]"
        >
          <Icon name="whatsapp" className="icon !h-[15px] !w-[15px]" />
          {meta.wishLabel}
        </button>
        <button
          onClick={() => navigate(`/members/${member.id}`)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-hairline bg-surface py-3.5 text-[13.5px] font-bold text-heading transition-colors hover:bg-paper"
        >
          <Icon name="eye" className="icon !h-[15px] !w-[15px]" />
          View Full Profile
        </button>
      </div>
    </div>
  )
}

function ProfileHeader({
  title,
  icon,
  accent,
  onClose,
}: {
  title: string
  icon: string
  accent: string
  onClose: () => void
}) {
  return (
    <div className="relative mb-5 flex items-center justify-center px-9">
      <h1 className="flex items-center gap-2 font-display text-[19px] font-bold text-heading md:text-[24px]">
        <Icon name={icon} className={`icon !h-[18px] !w-[18px] shrink-0 ${accent}`} />
        {title}
      </h1>
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:text-heading"
      >
        <Icon name="x" className="icon !h-[17px] !w-[17px]" />
      </button>
    </div>
  )
}

function formatCount(value: number | null, suffix: string): string | undefined {
  return value !== null ? `${value} ${suffix}` : undefined
}

function formatDate(value: string | undefined): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DetailRow({ label, value, last }: { label: string; value: string | undefined; last?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 py-2.5 ${last ? '' : 'border-b border-hairline'}`}>
      <span className="shrink-0 text-[12px] text-slate">{label}</span>
      <span className="text-right text-[12.5px] font-semibold text-heading">{value || '—'}</span>
    </div>
  )
}
