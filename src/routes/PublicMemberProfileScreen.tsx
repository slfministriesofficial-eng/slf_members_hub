import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import logo from '../assets/slf_logo_cropped.png'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { Reveal } from '../components/ui/Reveal'
import { IdCardFlipper } from '../features/members/IdCardFlipper'
import { fetchMemberPublic, type PublicMemberRecord } from '../features/members/api'
import { CHURCH_INFO } from '../constants/church'

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}`
}

// Public, unauthenticated page — the QR code on every membership card points
// here. Fetches fresh data on every load, so it always reflects the current
// Sheet without the QR ever needing to be regenerated. Everything below the
// member section (About, Leadership, Gallery, …) is static church content and
// renders immediately regardless of fetch state.
export function PublicMemberProfileScreen() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const id = searchParams.get('id')

  const [member, setMember] = useState<PublicMemberRecord | null | undefined>(undefined)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) {
      setMember(null)
      return
    }
    let cancelled = false
    setMember(undefined)
    setError(false)
    fetchMemberPublic(id)
      .then((data) => {
        if (!cancelled) setMember(data)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const isVisitor = member?.firstTimeVisiting === 'Yes'
  const sinceYear = (member?.joiningDate || member?.registrationDate || '').slice(0, 4)
  const notFound = error || member === null

  return (
    <div className="bg-canvas">
      {/* SECTION 1 — Hero welcome */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink-deep via-ink to-ink-soft px-4 py-16 text-center text-white sm:px-6">
        <div className="motion-safe:animate-[pulse-soft_5s_ease-in-out_infinite] pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brass/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-ink-soft/60 blur-3xl" />

        <div className="motion-safe:animate-[fade-rise_0.6s_ease-out_both] relative">
          <div className="motion-safe:animate-[scale-in_0.7s_ease-out_both] mx-auto mb-4 h-20 w-20 overflow-hidden rounded-full shadow-elev ring-4 ring-brass/70">
            <img src={logo} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="bg-gradient-to-b from-[#F6E3A8] via-[#D4A94C] to-[#8E6526] bg-clip-text font-display text-[26px] font-black leading-none text-transparent sm:text-[32px]">
            SLF MINISTRIES
          </div>
          <p className="mt-1.5 text-[13px] font-bold uppercase tracking-wide text-white/80">
            {CHURCH_INFO.name}
          </p>
          <p className="mx-auto mt-5 max-w-[440px] text-[13.5px] leading-relaxed text-white/85">
            {CHURCH_INFO.welcomeMessage}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[640px] px-4 py-10 sm:px-6">
        {/* SECTION 2 — Member profile */}
        <div className="mb-14">
          {notFound ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center shadow-card">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-status-alert-bg">
                <Icon name="x" className="icon !h-[24px] !w-[24px] text-status-alert-fg" />
              </span>
              <h1 className="font-display text-[19px] font-bold text-heading">Member Not Found</h1>
              <p className="text-[13px] text-slate">The membership record could not be located.</p>
              <button
                onClick={() => navigate('/')}
                className="mt-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white transition-transform hover:scale-105"
              >
                Return Home
              </button>
            </div>
          ) : member === undefined ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface p-6 shadow-card">
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="aspect-[8/5] w-full max-w-[380px] rounded-2xl" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          ) : (
            <>
              <div className="mb-5 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-status-regular-bg px-4 py-1.5 text-[11.5px] font-bold uppercase tracking-wide text-status-regular-fg">
                  <Icon name="check" className="icon !h-[13px] !w-[13px]" />
                  Verified Member
                </span>
              </div>

              <div className="mb-6 rounded-2xl bg-surface p-5 text-center shadow-card">
                <h1 className="font-display text-[22px] font-bold text-heading">{member.fullName}</h1>
                <p className="mt-0.5 font-mono text-[12.5px] text-slate">{member.memberId}</p>

                <div className="mt-5 grid grid-cols-2 gap-4 text-left sm:grid-cols-3">
                  <Detail label="Member Since" value={formatDate(member.joiningDate || member.registrationDate)} />
                  <Detail
                    label="Ministry / Group"
                    value={member.ministryInterests.length ? member.ministryInterests.join(', ') : '—'}
                  />
                  <Detail label="Believer Since" value={member.believerYears ? `${member.believerYears} yrs` : '—'} />
                  <Detail label="Baptism Status" value={member.baptized === 'Yes' ? 'Baptized' : 'Not yet'} />
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-center text-[12px] font-bold uppercase tracking-wide text-slate">
                  Digital Membership Card
                </h2>
                <div className="motion-safe:animate-[float-soft_6s_ease-in-out_infinite]">
                  <IdCardFlipper
                    name={member.fullName}
                    memberId={member.memberId}
                    bloodGroup={member.bloodGroup}
                    status={isVisitor ? 'visitor' : 'regular'}
                    statusLabel={isVisitor ? 'Visitor' : 'Member'}
                    sinceYear={sinceYear || undefined}
                    hideMobile
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* SECTION 3 — About */}
        <Reveal className="mb-14">
          <div className="relative overflow-hidden rounded-2xl bg-surface p-6 shadow-card sm:p-8">
            <Icon
              name="cross"
              className="icon pointer-events-none absolute -right-4 -top-4 !h-32 !w-32 text-brass opacity-[0.06]"
            />
            <h2 className="relative font-display text-[19px] font-bold text-heading">About SLF Ministries</h2>
            <p className="relative mt-3 text-[13.5px] leading-relaxed text-charcoal">{CHURCH_INFO.about}</p>
          </div>
        </Reveal>

        {/* SECTION 4 — Leadership */}
        <Reveal className="mb-14">
          <h2 className="mb-4 text-center font-display text-[19px] font-bold text-heading">Our Leadership</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {CHURCH_INFO.leadership.map((leader) => (
              <div
                key={leader.name}
                className="flex flex-col items-center rounded-2xl bg-surface p-6 text-center shadow-card transition-transform hover:-translate-y-1 hover:shadow-elev"
              >
                <span className="mb-3 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brass to-brass-deep shadow-md ring-4 ring-brass/20">
                  {leader.photo ? (
                    <img src={leader.photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="user" className="icon !h-9 !w-9 text-white" />
                  )}
                </span>
                <h3 className="font-display text-[15.5px] font-bold text-heading">{leader.name}</h3>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-brass-deep">
                  {leader.title}
                </p>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-slate">{leader.bio}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* SECTION 5 — Gallery (icon-based placeholder tiles until real photos are ready) */}
        <Reveal className="mb-14">
          <h2 className="mb-4 text-center font-display text-[19px] font-bold text-heading">Church Gallery</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CHURCH_INFO.gallery.map((item) => (
              <div
                key={item.label}
                className="group relative flex aspect-[4/3] flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-ink-deep via-ink to-ink-soft shadow-card"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-20 transition-transform duration-500 group-hover:scale-110"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle, rgba(212,169,76,0.7) 1px, transparent 1px)',
                    backgroundSize: '12px 12px',
                  }}
                />
                <Icon
                  name={item.icon}
                  className="icon relative !h-9 !w-9 text-brass transition-transform duration-500 group-hover:scale-110"
                />
                <span className="relative text-[11.5px] font-bold uppercase tracking-wide text-white">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[11.5px] italic text-slate">
            Real photos coming soon — placeholders shown for now.
          </p>
        </Reveal>

        {/* SECTION 6 — Church information */}
        <Reveal className="mb-14">
          <div className="rounded-2xl bg-surface p-6 shadow-card sm:p-8">
            <h2 className="mb-4 font-display text-[19px] font-bold text-heading">Church Information</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <InfoBlock icon="pin" label="Address">
                {CHURCH_INFO.addressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </InfoBlock>

              <InfoBlock icon="clock" label="Sunday Services">
                {CHURCH_INFO.services.map((s) => (
                  <div key={s.label} className="flex justify-between gap-3">
                    <span>{s.label}</span>
                    <span className="font-mono text-brass-deep">{s.time}</span>
                  </div>
                ))}
              </InfoBlock>

              <InfoBlock icon="phone" label="Church Contact">
                {CHURCH_INFO.phone}
              </InfoBlock>

              <InfoBlock icon="mail" label="Email">
                {CHURCH_INFO.email}
              </InfoBlock>

              <InfoBlock icon="globe" label="Website">
                {CHURCH_INFO.website}
              </InfoBlock>
            </div>
          </div>
        </Reveal>

        {/* SECTION 7 — Google Maps */}
        <Reveal className="mb-14">
          <h2 className="mb-3 text-center font-display text-[19px] font-bold text-heading">Find Us</h2>
          <div className="overflow-hidden rounded-2xl shadow-card">
            <iframe
              src={CHURCH_INFO.mapsEmbedUrl}
              title="Church location"
              className="h-72 w-full border-0 sm:h-80"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </Reveal>

        {/* SECTION 8 — Connect with us */}
        <Reveal className="mb-4">
          <h2 className="mb-4 text-center font-display text-[19px] font-bold text-heading">Connect With Us</h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SocialIcon icon="instagram" href={CHURCH_INFO.social.instagram} label="Instagram" />
            <SocialIcon icon="youtube" href={CHURCH_INFO.social.youtube} label="YouTube" />
            <SocialIcon icon="globe" href={CHURCH_INFO.social.website} label="Website" />
            <SocialIcon icon="pin" href={CHURCH_INFO.mapsLinkUrl} label="Google Maps" />
            <SocialIcon icon="chat" label="WhatsApp (coming soon)" />
          </div>
        </Reveal>
      </div>

      {/* SECTION 9 — Footer */}
      <footer className="bg-ink-deep px-4 py-10 text-center text-white/80 sm:px-6">
        <p className="text-[13px] font-semibold text-white">Thank you for visiting SLF Ministries.</p>
        <p className="mt-1 text-[12.5px] italic">"May God richly bless you and your family."</p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <SocialIcon icon="instagram" href={CHURCH_INFO.social.instagram} label="Instagram" dark />
          <SocialIcon icon="youtube" href={CHURCH_INFO.social.youtube} label="YouTube" dark />
          <SocialIcon icon="globe" href={CHURCH_INFO.social.website} label="Website" dark />
          <SocialIcon icon="pin" href={CHURCH_INFO.mapsLinkUrl} label="Google Maps" dark />
          <SocialIcon icon="chat" label="WhatsApp (coming soon)" dark />
        </div>

        <p className="mt-6 text-[11px] text-white/50">
          © {new Date().getFullYear()} SLF Ministries · Sarah Living Faith Ministries
        </p>
      </footer>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9.5px] font-bold uppercase tracking-wide text-slate">{label}</div>
      <div className="mt-0.5 truncate text-[13px] font-semibold text-heading">{value}</div>
    </div>
  )
}

function InfoBlock({
  icon,
  label,
  children,
}: {
  icon: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-2">
        <Icon name={icon} className="icon !h-[16px] !w-[16px] text-brass-deep" />
      </span>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate">{label}</div>
        <div className="mt-0.5 text-[13px] leading-relaxed text-charcoal">{children}</div>
      </div>
    </div>
  )
}

function SocialIcon({
  icon,
  href,
  label,
  dark,
}: {
  icon: string
  href?: string
  label: string
  dark?: boolean
}) {
  const baseClass = `flex h-11 w-11 items-center justify-center rounded-full shadow-card transition-transform hover:scale-110 ${
    dark ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-surface text-heading'
  }`

  if (!href) {
    return (
      <span title={label} className={`${baseClass} cursor-default opacity-50`}>
        <Icon name={icon} className="icon !h-[19px] !w-[19px]" />
      </span>
    )
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={baseClass}>
      <Icon name={icon} className="icon !h-[19px] !w-[19px]" />
    </a>
  )
}
