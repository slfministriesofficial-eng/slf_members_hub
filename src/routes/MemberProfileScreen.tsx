import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import logo from '../assets/slf_logo_cropped.png'
import { Icon } from '../components/ui/Icon'
import { Reveal } from '../components/ui/Reveal'
import { Skeleton, SkeletonIdCard } from '../components/ui/Skeleton'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { useMembers } from '../features/members/MembersContext'
import { IdCardFull } from '../features/members/IdCardFull'
import {
  buildMemberProfileUrl,
  buildRemovalMessage,
  normalizeWhatsappNumber,
  openWhatsappChat,
  openWhatsappWithText,
} from '../templates/whatsapp'
import { DeleteMemberModal } from '../features/members/DeleteMemberModal'
import { NotificationStatusBell } from '../notifications/NotificationStatusBell'
import { CHURCH_INFO } from '../constants/church'
import { toTitleCase } from '../utils/initials'

function formatFullDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'long' })} ${d.getFullYear()}`
}

function calculateAge(dobStr: string | undefined): number | null {
  if (!dobStr) return null
  const dob = new Date(dobStr)
  if (Number.isNaN(dob.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate())
  if (!hadBirthdayThisYear) age -= 1
  return age >= 0 ? age : null
}

export function MemberProfileScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { members, getMember, isLoading, isError, deleteMember, isDeleting } = useMembers()
  const member = (id ? getMember(id) : undefined) ?? members[0]
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  if (isLoading) {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface shadow-card"
          >
            <Icon name="chevron" className="icon !h-[17px] !w-[17px] rotate-180 text-heading" />
          </button>
        </div>
        <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl bg-surface p-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>
        <div className="mb-4">
          <SkeletonIdCard />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-[90px] w-full rounded-2xl" />
          <Skeleton className="h-[140px] w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (isError || !member) {
    return (
      <p className="py-10 text-center text-[13px] text-slate">
        {isError ? 'Could not load members — check your connection.' : 'Member not found.'}
      </p>
    )
  }

  function requestDelete() {
    setShowDeleteModal(true)
  }

  // Sends the WhatsApp notice (if a reason was given) BEFORE the delete
  // mutation is awaited, so window.open still runs inside the click's
  // original user-gesture — awaiting first would risk the popup being blocked.
  async function runDelete(reason: string) {
    if (!member) return
    setShowDeleteModal(false)
    if (reason) {
      const number = normalizeWhatsappNumber(member.whatsapp)
      if (number) {
        openWhatsappWithText(number, buildRemovalMessage(member, reason))
      } else {
        setToast(`WhatsApp number is not available for ${member.name} — reason was not sent.`)
      }
    }
    setDeleteError(null)
    try {
      await deleteMember(member.memberId)
      navigate('/members')
    } catch {
      setDeleteError('Could not delete this member — check your connection and try again.')
    }
  }

  function sendWhatsapp() {
    const number = normalizeWhatsappNumber(member.whatsapp)
    if (!number) {
      setToast(`WhatsApp number is not available for ${member.name}.`)
      return
    }
    openWhatsappChat(member, number)
  }

  function viewDigitalProfile() {
    window.open(buildMemberProfileUrl(member.memberId), '_blank', 'noopener,noreferrer')
  }

  const age = calculateAge(member.dob)
  const hasFamily = Boolean(member.familyCount)
  const hasFamilyDetails = Boolean(member.spouse || member.children?.length)
  const ministryList = member.ministryInterests?.length ? member.ministryInterests : member.ministry !== '—' ? [member.ministry] : []

  return (
    // overflow-x-clip: the ID card's springy 3D flip overshoots past 180° and
    // its perspective projection momentarily sticks out past the viewport —
    // without the clip, mobile browsers keep the page horizontally scrollable.
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] overflow-x-clip pb-24 md:pb-8">
      {/* HEADER */}
      <PageBackHeader title="Member Profile" onBack={() => navigate('/members')} />

      <div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-start md:justify-between">
        <p className="-mt-2 overflow-hidden whitespace-nowrap text-[10px] text-slate md:mt-0 md:max-w-[520px] md:whitespace-normal md:text-[12.5px]">
          View complete member information, membership card, ministry and family details.
        </p>
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <HeaderActionButton icon="pencil" label="Edit Member" onClick={() => navigate(`/members/${member.id}/edit`)} />
          <HeaderActionButton icon="id" label="Membership Card" onClick={() => navigate('/membership-cards')} />
          <HeaderActionButton icon="chat" label="Send to WhatsApp" accent onClick={sendWhatsapp} />
          <HeaderActionButton icon="globe" label="View Digital Profile" onClick={viewDigitalProfile} />
          <HeaderActionButton
            icon="trash"
            label={isDeleting ? 'Removing…' : 'Delete Member'}
            danger
            onClick={requestDelete}
          />
        </div>
      </div>

      {deleteError && (
        <p className="mb-4 rounded-xl bg-status-alert-bg px-4 py-2.5 text-[12.5px] font-semibold text-status-alert-fg">
          {deleteError}
        </p>
      )}

      {/* SECTION 1 — PROFILE HERO */}
      <div className="motion-safe:animate-[scale-in_0.4s_ease-out_both] mb-5 flex flex-col items-center gap-2.5 rounded-[28px] bg-gradient-to-br from-surface via-surface to-paper p-4 text-center md:mb-6 md:gap-3 md:p-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep font-display text-[24px] font-bold text-white shadow-elev ring-4 ring-brass/20 md:h-28 md:w-28 md:text-[28px]">
          {member.initials}
        </div>

        <div>
          <h2 className="font-display text-[21px] font-black uppercase tracking-tight text-heading md:text-[24px]">
            {toTitleCase(member.name)}
          </h2>
          {member.preferredName && (
            <p className="mt-0.5 text-[12.5px] text-slate">Preferred Name: {member.preferredName}</p>
          )}
          <p className="mt-0.5 font-mono text-[12.5px] text-slate">{member.memberId}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Badge tone="regular" icon="check">
            Active Member
          </Badge>
          <NotificationStatusBell memberId={member.memberId} />
          {ministryList.length > 0 && (
            <Badge tone="leader" icon="megaphone">
              {ministryList.join(', ')}
            </Badge>
          )}
          {hasFamily && (
            <Badge tone="slate" icon="rings">
              +{member.familyCount} Family
            </Badge>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11.5px] text-slate">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="cal-check" className="icon !h-[13px] !w-[13px]" />
            Member Since {formatFullDate(member.joiningDateRaw || member.registrationDate)}
          </span>
          {member.registrationDate && (
            <span className="inline-flex items-center gap-1.5">
              <Icon name="note" className="icon !h-[13px] !w-[13px]" />
              Registered {formatFullDate(member.registrationDate)}
            </span>
          )}
        </div>
      </div>

      {/* SECTION 2 — DIGITAL MEMBERSHIP CARD */}
      <div className="mb-5 md:mb-6">
        <h3 className="mb-3 text-center text-[12px] font-bold uppercase tracking-wide text-slate">
          Digital Membership Card
        </h3>
        <div className="mx-auto max-w-[420px]">
          <IdCardFull
            name={member.name}
            memberId={member.memberId}
            mobile={member.phone}
            bloodGroup={member.bloodGroup}
            status={member.status}
            statusLabel={member.statusLabel}
            sinceYear={member.joinDate.slice(-4)}
          />
        </div>

        <div className="mx-auto mt-4 grid max-w-[420px] grid-cols-2 gap-2 md:max-w-none md:grid-cols-4">
          <CardActionButton icon="globe" label="View Digital Profile" onClick={viewDigitalProfile} />
          <CardActionButton icon="download" label="Download PDF" disabled title="Coming soon" />
          <CardActionButton icon="share" label="Share Card" onClick={() => navigate('/membership-cards')} />
          <CardActionButton icon="chat" label="Send to WhatsApp" accent onClick={sendWhatsapp} />
        </div>
      </div>

      {/* min-w-0 on the grid children: grid items refuse to shrink below their
          content's min width by default, so one wide inner value would stretch
          every card past the viewport ("details out of the box"). */}
      <div className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0 space-y-4 md:space-y-5">
          {/* SECTION 3 — QUICK SUMMARY */}
          <Reveal>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-6">
              <SummaryStat icon="cake" label="Age" value={age !== null ? `${age} yrs` : '—'} />
              <SummaryStat icon="user" label="Gender" value={member.gender || '—'} />
              <SummaryStat icon="heart" label="Blood Group" value={member.bloodGroup || '—'} />
              <SummaryStat icon="rings" label="Marital Status" value={member.maritalStatus || '—'} />
              <SummaryStat icon="building" label="Occupation" value={member.occupation || '—'} />
              <SummaryStat
                icon="cross"
                label="Believer Since"
                value={member.believerYears ? `${member.believerYears} yrs` : '—'}
              />
            </div>
          </Reveal>

          {/* SECTION 4 — PERSONAL INFORMATION */}
          <Reveal>
            <SectionCard icon="user" title="Personal Information">
              <InfoField icon="cake" label="Date of Birth" value={formatFullDate(member.dob)} />
              <InfoField icon="user" label="Gender" value={member.gender || '—'} />
              <InfoField icon="rings" label="Marital Status" value={member.maritalStatus || '—'} />
              <InfoField icon="building" label="Occupation" value={member.occupation || '—'} />
              <InfoField icon="pin" label="Address" value={member.address || '—'} />
            </SectionCard>
          </Reveal>

          {/* SECTION 5 — CONTACT INFORMATION */}
          <Reveal>
            <SectionCard icon="phone" title="Contact Information">
              <InfoField
                icon="phone"
                label="Primary Phone"
                value={member.phone || '—'}
                action={
                  member.phone ? (
                    <QuickLinkButton icon="phone" label="Call" href={`tel:${member.phone.replace(/\s+/g, '')}`} />
                  ) : undefined
                }
              />
              <InfoField
                icon="chat"
                label="WhatsApp Number"
                value={member.whatsapp || '—'}
                action={<QuickLinkButton icon="chat" label="WhatsApp" onClick={sendWhatsapp} />}
              />
              <InfoField
                icon="mail"
                label="Email Address"
                value={member.email || '—'}
                action={
                  member.email ? (
                    <QuickLinkButton icon="mail" label="Email" href={`mailto:${member.email}`} />
                  ) : undefined
                }
              />
              <InfoField icon="pin" label="Address" value={member.address || '—'} />
              <div className="my-2 border-t border-hairline" />
              <InfoField icon="shield" label="Emergency Contact Name" value={member.emergencyContactName || '—'} />
              <InfoField icon="phone" label="Emergency Contact Phone" value={member.emergencyContactMobile || '—'} />
              <InfoField
                icon="users"
                label="Emergency Contact Relationship"
                value={member.emergencyContactRelationship || '—'}
              />
            </SectionCard>
          </Reveal>

          {/* SECTION 6 — SPIRITUAL INFORMATION */}
          <Reveal>
            <SectionCard icon="cross" title="Spiritual Information">
              <InfoField icon="cal-check" label="Join Date" value={formatFullDate(member.joiningDateRaw)} />
              <InfoField
                icon="flag"
                label="First Time Visitor"
                value={member.firstTimeVisiting === undefined ? '—' : member.firstTimeVisiting ? 'Yes' : 'No'}
              />
              <InfoField icon="building" label="Previous Church" value={member.previousChurch || '—'} />
              <InfoField
                icon="cross"
                label="Baptism Status"
                value={member.baptized === undefined ? '—' : member.baptized ? 'Baptized' : 'Not yet'}
              />
              <InfoField icon="cal-check" label="Baptism Date" value={formatFullDate(member.baptizedDate)} />
              <InfoField icon="user" label="Baptized By" value={member.baptizedBy || '—'} />
              <InfoField
                icon="heart"
                label="Believer Since"
                value={member.believerYears ? `${member.believerYears} years` : '—'}
              />
              <InfoField icon="megaphone" label="Ministry / Group" value={ministryList.join(', ') || '—'} />
            </SectionCard>
          </Reveal>

          {/* SECTION 7 — FAMILY INFORMATION */}
          <Reveal>
            <SectionCard icon="rings" title="Family Information">
              {hasFamilyDetails ? (
                <>
                  {member.spouse && <InfoField icon="heart" label="Spouse Name" value={member.spouse} />}
                  {member.spouseDob && (
                    <InfoField icon="cake" label="Spouse Date of Birth" value={formatFullDate(member.spouseDob)} />
                  )}
                  {member.spouseMobile && <InfoField icon="phone" label="Spouse Phone" value={member.spouseMobile} />}

                  {member.children?.length ? (
                    <div className="mt-3">
                      <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-slate">Children</div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {member.children.map((child) => (
                          <div
                            key={child.name}
                            className="flex flex-col items-center gap-1.5 rounded-2xl bg-paper px-3 py-3 text-center"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper-2">
                              <Icon name="cake" className="icon !h-[15px] !w-[15px] text-brass-deep" />
                            </span>
                            <span className="truncate text-[12px] font-bold text-heading">{child.name}</span>
                            <span className="text-[10.5px] text-slate">{formatFullDate(child.birthdate)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="py-2 text-[12.5px] text-slate">No family information available.</p>
              )}
            </SectionCard>
          </Reveal>

          {/* SECTION 8 — ATTENDANCE SUMMARY */}
          <Reveal>
            <SectionCard icon="cal-check" title="Attendance Summary" note="Coming soon">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                <PlaceholderStat label="Total" value="—" />
                <PlaceholderStat label="Present" value="—" />
                <PlaceholderStat label="Absent" value="—" />
                <PlaceholderStat label="Attendance %" value="—" />
                <PlaceholderStat label="Last Attended" value="—" />
              </div>
              <p className="mt-3 text-[11.5px] text-slate">
                This section will populate automatically once Attendance tracking is connected to member records.
              </p>
            </SectionCard>
          </Reveal>

          {/* SECTION 9 — MEMBER TIMELINE */}
          <Reveal>
            <SectionCard icon="clock" title="Member Timeline">
              {member.registrationDate ? (
                <TimelineItem
                  icon="plus"
                  title="Member Registered"
                  date={formatFullDate(member.registrationDate)}
                />
              ) : (
                <p className="py-2 text-[12.5px] text-slate">No activity available.</p>
              )}
            </SectionCard>
          </Reveal>

          {/* SECTION 10 — CHURCH INFORMATION */}
          <Reveal>
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink-deep via-ink to-ink-soft p-5 text-white md:p-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-brass/70">
                  <img src={logo} alt="" className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="font-display text-[16px] font-bold">{CHURCH_INFO.shortName}</div>
                  <div className="text-[11px] text-white/70">{CHURCH_INFO.name}</div>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-[12.5px] text-white/85">
                {CHURCH_INFO.addressLines.map((line) => (
                  <div key={line} className="flex items-center gap-2">
                    <Icon name="pin" className="icon !h-[13px] !w-[13px] shrink-0 text-brass" />
                    {line}
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <Icon name="phone" className="icon !h-[13px] !w-[13px] shrink-0 text-brass" />
                  {CHURCH_INFO.phone}
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="globe" className="icon !h-[13px] !w-[13px] shrink-0 text-brass" />
                  {CHURCH_INFO.website}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <a
                  href={CHURCH_INFO.mapsLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-white/15"
                >
                  <Icon name="pin" className="icon !h-[13px] !w-[13px]" />
                  Google Maps
                </a>
                <a
                  href={CHURCH_INFO.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-transform hover:scale-110"
                >
                  <Icon name="instagram" className="icon !h-[15px] !w-[15px]" />
                </a>
                <a
                  href={CHURCH_INFO.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-transform hover:scale-110"
                >
                  <Icon name="youtube" className="icon !h-[15px] !w-[15px]" />
                </a>
                <span
                  title="WhatsApp (coming soon)"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 opacity-50"
                >
                  <Icon name="chat" className="icon !h-[15px] !w-[15px]" />
                </span>
              </div>
            </div>
          </Reveal>
        </div>

        {/* SECTION 11 — QUICK ACTION PANEL (desktop only; mobile gets the sticky bottom bar) */}
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-1.5 rounded-2xl bg-surface p-3">
            <p className="px-2 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-wide text-slate">
              Quick Actions
            </p>
            <SidebarActionButton icon="pencil" label="Edit Member" onClick={() => navigate(`/members/${member.id}/edit`)} />
            <SidebarActionButton icon="id" label="Membership Card" onClick={() => navigate('/membership-cards')} />
            <SidebarActionButton icon="chat" label="Send to WhatsApp" onClick={sendWhatsapp} />
            <SidebarActionButton icon="globe" label="View Digital Profile" onClick={viewDigitalProfile} />
            <SidebarActionButton icon="cal-check" label="Attendance" onClick={() => navigate('/attendance')} />
            <SidebarActionButton icon="download" label="Download PDF" disabled title="Coming soon" />
            <SidebarActionButton icon="share" label="Share Card" onClick={() => navigate('/membership-cards')} />
          </div>
        </div>
      </div>

      {/* Mobile sticky action bar — stands in for the desktop Quick Action Panel */}
      <div className="fixed inset-x-3 bottom-24 z-30 flex items-center gap-1 rounded-2xl bg-ink-deep p-1.5 shadow-elev md:hidden">
        <MobileBarButton icon="pencil" label="Edit" onClick={() => navigate(`/members/${member.id}/edit`)} />
        <MobileBarButton icon="id" label="Card" onClick={() => navigate('/membership-cards')} />
        <MobileBarButton icon="chat" label="WhatsApp" onClick={sendWhatsapp} />
        <MobileBarButton icon="globe" label="Profile" onClick={viewDigitalProfile} />
        <MobileBarButton icon="trash" label="Delete" danger onClick={requestDelete} />
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-[168px] z-40 flex justify-center px-4 md:bottom-8 motion-safe:animate-[fade-rise_0.3s_ease-out]">
          <div className="flex max-w-[92vw] items-center gap-2 rounded-full bg-ink-deep px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-elev">
            <Icon name="chat" className="icon !h-[14px] !w-[14px] shrink-0 text-white" />
            <span className="truncate">{toast}</span>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <DeleteMemberModal member={member} onCancel={() => setShowDeleteModal(false)} onConfirm={runDelete} />
      )}
    </div>
  )
}

function HeaderActionButton({
  icon,
  label,
  onClick,
  accent,
  danger,
}: {
  icon: string
  label: string
  onClick: () => void
  accent?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2.5 text-[12px] font-bold transition-transform hover:scale-105 ${
        accent
          ? 'bg-[#25D366] text-white'
          : danger
            ? 'bg-status-alert-bg text-status-alert-fg'
            : 'bg-surface text-heading shadow-card'
      }`}
    >
      <Icon
        name={icon}
        className={`icon !h-[14px] !w-[14px] ${accent || danger ? '' : 'text-heading'} ${accent ? 'text-white' : ''}`}
      />
      {label}
    </button>
  )
}

function MobileBarButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors hover:bg-white/10 ${
        danger ? 'text-[#EFA097]' : 'text-white'
      }`}
    >
      <Icon name={icon} className="icon !h-[16px] !w-[16px]" />
      <span className="text-[9.5px] font-bold">{label}</span>
    </button>
  )
}

function SidebarActionButton({
  icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: string
  label: string
  onClick?: () => void
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12.5px] font-semibold text-charcoal transition-colors hover:bg-paper disabled:opacity-40"
    >
      <Icon name={icon} className="icon !h-[15px] !w-[15px] text-brass-deep" />
      {label}
    </button>
  )
}

function CardActionButton({
  icon,
  label,
  onClick,
  disabled,
  title,
  accent,
}: {
  icon: string
  label: string
  onClick?: () => void
  disabled?: boolean
  title?: string
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center transition-transform hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100 ${
        accent ? 'bg-[#25D366] text-white' : 'bg-surface text-heading'
      }`}
    >
      <Icon name={icon} className={`icon !h-[17px] !w-[17px] ${accent ? 'text-white' : 'text-brass-deep'}`} />
      <span className="text-[10.5px] font-bold leading-tight">{label}</span>
    </button>
  )
}

function QuickLinkButton({
  icon,
  label,
  href,
  onClick,
}: {
  icon: string
  label: string
  href?: string
  onClick?: () => void
}) {
  const className =
    'flex shrink-0 items-center gap-1 rounded-full bg-paper-2 px-2.5 py-1.5 text-[10.5px] font-bold text-brass-deep transition-colors hover:bg-brass/20'
  if (href) {
    return (
      <a href={href} className={className}>
        <Icon name={icon} className="icon !h-[11px] !w-[11px]" />
        {label}
      </a>
    )
  }
  return (
    <button onClick={onClick} className={className}>
      <Icon name={icon} className="icon !h-[11px] !w-[11px]" />
      {label}
    </button>
  )
}

const BADGE_TONES: Record<string, string> = {
  regular: 'bg-status-regular-bg text-status-regular-fg',
  leader: 'bg-status-leader-bg text-status-leader-fg',
  slate: 'bg-paper-2 text-slate',
}

function Badge({ tone, icon, children }: { tone: keyof typeof BADGE_TONES; icon: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-wide ${BADGE_TONES[tone]}`}
    >
      <Icon name={icon} className="icon !h-[11px] !w-[11px]" />
      {children}
    </span>
  )
}

function SummaryStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 rounded-2xl bg-surface p-2.5 text-center transition-transform hover:-translate-y-0.5 md:gap-1.5 md:p-3.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep md:h-9 md:w-9">
        <Icon name={icon} className="icon !h-[14px] !w-[14px] text-white md:!h-[15px] md:!w-[15px]" />
      </span>
      <span className="max-w-full truncate text-[12px] font-bold text-heading md:text-[12.5px]">{value}</span>
      <span className="text-[8.5px] font-semibold uppercase tracking-wide text-slate md:text-[9px]">{label}</span>
    </div>
  )
}

function SectionCard({
  icon,
  title,
  note,
  children,
}: {
  icon: string
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    // overflow-hidden: nothing inside a section card may ever escape its box
    <div className="overflow-hidden rounded-2xl bg-surface p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate">
          <Icon name={icon} className="icon !h-[13px] !w-[13px] text-brass-deep" />
          {title}
        </div>
        {note && (
          <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate">
            {note}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function InfoField({
  icon,
  label,
  value,
  action,
}: {
  icon: string
  label: string
  value: string
  action?: ReactNode
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 py-1.5">
      <Icon name={icon} className="icon !h-[14px] !w-[14px] shrink-0 text-slate" />
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-charcoal">{label}</span>
      <span className="min-w-0 truncate text-right text-[12.5px] font-semibold text-heading">{value}</span>
      {action}
    </div>
  )
}

function PlaceholderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper px-2 py-3 text-center">
      <div className="font-display text-[16px] font-bold text-faint">{value}</div>
      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate">{label}</div>
    </div>
  )
}

function TimelineItem({ icon, title, date }: { icon: string; title: string; date: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-status-regular-bg">
        <Icon name={icon} className="icon !h-[14px] !w-[14px] text-status-regular-fg" />
      </span>
      <div>
        <div className="text-[12.5px] font-bold text-heading">{title}</div>
        <div className="text-[11px] text-slate">{date}</div>
      </div>
    </div>
  )
}

