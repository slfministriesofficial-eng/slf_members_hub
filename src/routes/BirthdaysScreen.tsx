import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { MobileBackButton } from '../components/ui/MobileBackButton'
import { useMembers } from '../features/members/MembersContext'
import { MemberCard } from '../features/members/MemberCard'
import {
  deriveBirthdays,
  deriveAnniversaries,
  deriveAnnualEvents,
  deriveNewMembers,
  formatUpcomingLabel,
  formatPastLabel,
  dateParts,
} from '../utils/celebrations'
import { useCompletedWishes } from '../utils/completedWishes'
import { markCelebrationsSeen } from '../hooks/useAlertCounts'

export function BirthdaysScreen() {
  const { members, isLoading, isError } = useMembers()
  const navigate = useNavigate()
  // Each "Today's …" section collapses independently; birthdays open by default.
  const [open, setOpen] = useState<Record<string, boolean>>({ birthday: true })
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }))
  const isWished = useCompletedWishes()

  const now = useMemo(() => new Date(), [])
  const birthdays = useMemo(() => deriveBirthdays(members), [members])
  const anniversaries = useMemo(() => deriveAnniversaries(members), [members])
  // All four annual kinds in one list — feeds the baptism/membership counts.
  const annualEvents = useMemo(() => deriveAnnualEvents(members), [members])
  // Recently added members (last 30 days) — no first-time-visiting filter.
  const recentNewMembers = useMemo(() => deriveNewMembers(members).filter((e) => e.daysAgo <= 30), [members])

  // Opening this page counts as "seeing" today's + this week's celebrations —
  // clears the Birthdays badges on every nav surface.
  useEffect(() => {
    if (isLoading || isError) return
    const weekIds = [...birthdays, ...anniversaries].filter((e) => e.daysAway <= 7).map((e) => e.member.id)
    markCelebrationsSeen(weekIds)
  }, [isLoading, isError, birthdays, anniversaries])

  const todaysBirthdays = birthdays.filter((e) => e.daysAway === 0)
  const todaysAnniversaries = anniversaries.filter((e) => e.daysAway === 0)
  const todaysBaptisms = annualEvents.filter((e) => e.kind === 'baptism' && e.daysAway === 0)
  const todaysMembership = annualEvents.filter((e) => e.kind === 'membership' && e.daysAway === 0)

  const birthdaysToShow = todaysBirthdays.filter((e) => !isWished(e.member.id, 'birthday'))
  const anniversariesToShow = todaysAnniversaries.filter((e) => !isWished(e.member.id, 'wedding'))
  const baptismsToShow = todaysBaptisms.filter((e) => !isWished(e.member.id, 'baptism'))
  const membershipToShow = todaysMembership.filter((e) => !isWished(e.member.id, 'membership'))
  const newMembersToShow = recentNewMembers.filter((e) => !isWished(e.member.id, 'visitor'))

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <div className="mb-5">
        <div className="flex items-center gap-1">
          <MobileBackButton />
          <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">
            Birthdays &amp; Anniversaries
          </h1>
        </div>
        <p className="mt-1 text-[12.5px] text-slate">
          Celebrate and bless our church family on their special occasions.
        </p>
      </div>

      {/* FIVE CELEBRATION CARDS — one per event type, same five colors as the
          dashboard's This-week labels. Each opens that type's full-year list. */}
      <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        <CelebrationCard
          icon="cake"
          title="Birthdays"
          description="Wish members on their birthday."
          meta={todaysBirthdays.length > 0 ? `${todaysBirthdays.length} today` : 'None today'}
          active={todaysBirthdays.length > 0}
          tag="Today"
          accent="bg-tint-amber-fg"
          buttonLabel="View Birthdays"
          onClick={() => navigate(`/birthdays/birthdays${todaysBirthdays.length > 0 ? '?filter=today' : ''}`)}
        />
        <CelebrationCard
          icon="rings"
          title="Anniversaries"
          description="Bless couples on their wedding day."
          meta={todaysAnniversaries.length > 0 ? `${todaysAnniversaries.length} today` : 'None today'}
          active={todaysAnniversaries.length > 0}
          tag="Today"
          accent="bg-tint-pink-fg"
          buttonLabel="View Anniversaries"
          onClick={() => navigate(`/birthdays/anniversaries${todaysAnniversaries.length > 0 ? '?filter=today' : ''}`)}
        />
        <CelebrationCard
          icon="cross"
          title="Baptisms"
          description="Celebrate baptism anniversaries."
          meta={todaysBaptisms.length > 0 ? `${todaysBaptisms.length} today` : 'None today'}
          active={todaysBaptisms.length > 0}
          tag="Today"
          accent="bg-tint-blue-fg"
          buttonLabel="View Baptisms"
          onClick={() => navigate(`/birthdays/baptisms${todaysBaptisms.length > 0 ? '?filter=today' : ''}`)}
        />
        <CelebrationCard
          icon="heart"
          title="Membership"
          description="Years since they joined SLF."
          meta={todaysMembership.length > 0 ? `${todaysMembership.length} today` : 'None today'}
          active={todaysMembership.length > 0}
          tag="Today"
          accent="bg-tint-purple-fg"
          buttonLabel="View Membership"
          onClick={() => navigate(`/birthdays/membership${todaysMembership.length > 0 ? '?filter=today' : ''}`)}
        />
        <CelebrationCard
          icon="users"
          title="New Members"
          description="Welcome recently added members."
          meta={recentNewMembers.length > 0 ? `${recentNewMembers.length} recently` : 'None recently'}
          active={recentNewMembers.length > 0}
          tag="Recent"
          accent="bg-tint-green-fg"
          buttonLabel="View New Members"
          onClick={() => navigate('/birthdays/visitors')}
        />
      </div>

      {isError && (
        <p className="py-8 text-center text-[13px] text-slate">Could not load members — check your connection.</p>
      )}

      {!isError && isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      )}

      {!isError && !isLoading && (
        <div className="space-y-3">
          {/* Today's Birthdays */}
          <CollapsibleSection
            icon="cake"
            iconClass="text-tint-amber-fg"
            title="Today's Birthdays"
            count={birthdaysToShow.length}
            open={!!open.birthday}
            onToggle={() => toggle('birthday')}
          >
            {birthdaysToShow.length === 0 ? (
              <EmptyRow text="No birthdays to show." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {birthdaysToShow.map((e) => {
                  const { day, month } = dateParts(e.nextDate)
                  return (
                    <MemberCard
                      key={e.member.id}
                      member={e.member}
                      type="birthday"
                      dateDay={day}
                      dateMonth={month}
                      subLabel={e.age !== null ? `${e.age} yrs` : undefined}
                      countdownLabel={formatUpcomingLabel(e.nextDate, now)}
                      completed={isWished(e.member.id, 'birthday')}
                      onView={() => navigate(`/celebration-profile/birthday/${e.member.id}`)}
                      onSend={() => navigate(`/send-wish/birthday/${e.member.id}?occasion=birthday`)}
                      sendLabel="Send Wishes"
                    />
                  )
                })}
              </div>
            )}
          </CollapsibleSection>

          {/* Today's Anniversaries */}
          <CollapsibleSection
            icon="rings"
            iconClass="text-tint-pink-fg"
            title="Today's Anniversaries"
            count={anniversariesToShow.length}
            open={!!open.wedding}
            onToggle={() => toggle('wedding')}
          >
            {anniversariesToShow.length === 0 ? (
              <EmptyRow text="No anniversaries to show." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {anniversariesToShow.map((e) => {
                  const { day, month } = dateParts(e.nextDate)
                  return (
                    <MemberCard
                      key={e.member.id}
                      member={e.member}
                      type="anniversary"
                      dateDay={day}
                      dateMonth={month}
                      subLabel={e.yearsMarried !== null ? `${e.yearsMarried} yrs married` : undefined}
                      coupleName={e.member.spouse}
                      countdownLabel={formatUpcomingLabel(e.nextDate, now)}
                      completed={isWished(e.member.id, 'wedding')}
                      onView={() => navigate(`/celebration-profile/anniversary/${e.member.id}`)}
                      onSend={() => navigate(`/send-wish/anniversary/${e.member.id}?occasion=wedding`)}
                      sendLabel="Send Wishes"
                    />
                  )
                })}
              </div>
            )}
          </CollapsibleSection>

          {/* Today's Baptism Anniversaries */}
          <CollapsibleSection
            icon="cross"
            iconClass="text-tint-blue-fg"
            title="Today's Baptism Anniversaries"
            count={baptismsToShow.length}
            open={!!open.baptism}
            onToggle={() => toggle('baptism')}
          >
            {baptismsToShow.length === 0 ? (
              <EmptyRow text="No baptism anniversaries to show." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {baptismsToShow.map((e) => {
                  const { day, month } = dateParts(e.nextDate)
                  return (
                    <MemberCard
                      key={e.member.id}
                      member={e.member}
                      type="baptism"
                      dateDay={day}
                      dateMonth={month}
                      subLabel={e.years !== null ? `${e.years} yr${e.years === 1 ? '' : 's'}` : undefined}
                      countdownLabel={formatUpcomingLabel(e.nextDate, now)}
                      completed={isWished(e.member.id, 'baptism')}
                      onView={() => navigate(`/members/${e.member.id}`)}
                      onSend={() => navigate(`/send-wish/custom/${e.member.id}?occasion=baptism`)}
                      sendLabel="Send Wishes"
                    />
                  )
                })}
              </div>
            )}
          </CollapsibleSection>

          {/* Today's Membership Anniversaries */}
          <CollapsibleSection
            icon="heart"
            iconClass="text-tint-purple-fg"
            title="Today's Membership Anniversaries"
            count={membershipToShow.length}
            open={!!open.membership}
            onToggle={() => toggle('membership')}
          >
            {membershipToShow.length === 0 ? (
              <EmptyRow text="No membership anniversaries to show." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {membershipToShow.map((e) => {
                  const { day, month } = dateParts(e.nextDate)
                  return (
                    <MemberCard
                      key={e.member.id}
                      member={e.member}
                      type="membership"
                      dateDay={day}
                      dateMonth={month}
                      subLabel={e.years !== null ? `${e.years} yr${e.years === 1 ? '' : 's'}` : undefined}
                      countdownLabel={formatUpcomingLabel(e.nextDate, now)}
                      completed={isWished(e.member.id, 'membership')}
                      onView={() => navigate(`/members/${e.member.id}`)}
                      onSend={() => navigate(`/send-wish/custom/${e.member.id}?occasion=membership`)}
                      sendLabel="Send Wishes"
                    />
                  )
                })}
              </div>
            )}
          </CollapsibleSection>

          {/* Recent New Members */}
          <CollapsibleSection
            icon="users"
            iconClass="text-tint-green-fg"
            title="New Members"
            count={newMembersToShow.length}
            open={!!open.visitor}
            onToggle={() => toggle('visitor')}
          >
            {newMembersToShow.length === 0 ? (
              <EmptyRow text="No recent new members to show." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {newMembersToShow.map((e) => {
                  const { day, month } = dateParts(e.joinedDate)
                  return (
                    <MemberCard
                      key={e.member.id}
                      member={e.member}
                      type="new-member"
                      dateDay={day}
                      dateMonth={month}
                      subLabel="First visit"
                      countdownLabel={formatPastLabel(e.joinedDate, now)}
                      completed={isWished(e.member.id, 'visitor')}
                      onView={() => navigate(`/celebration-profile/new-member/${e.member.id}`)}
                      onSend={() => navigate(`/send-wish/welcome/${e.member.id}?occasion=visitor`)}
                      sendLabel="Send Welcome"
                    />
                  )
                })}
              </div>
            )}
          </CollapsibleSection>
        </div>
      )}

    </div>
  )
}

/** A collapsible "Today's …" section — one header pill that expands its list. */
function CollapsibleSection({
  icon,
  iconClass,
  title,
  count,
  open,
  onToggle,
  children,
}: {
  icon: string
  iconClass: string
  title: string
  count: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-2xl bg-surface p-4 shadow-card transition-colors hover:bg-paper"
      >
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-heading">
          <Icon name={icon} className={`icon !h-[14px] !w-[14px] ${iconClass}`} />
          {title} ({count})
        </span>
        <Icon
          name="chevron"
          className={`icon !h-[14px] !w-[14px] text-slate transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
  )
}

/**
 * A celebration card in the same style as the Attendance / Announcements hub
 * cards — icon square, title, description, a meta line, and a full-width
 * bottom button. When `active` (an event falls today), the whole card fills
 * with its theme color so the admin sees at a glance who needs wishes.
 */
function CelebrationCard({
  icon,
  title,
  description,
  meta,
  active = false,
  tag,
  accent,
  buttonLabel,
  onClick,
}: {
  icon: string
  title: string
  description: string
  meta: string
  active?: boolean
  // A small corner tag shown only when active (e.g. "Today" / "Recent").
  tag?: string
  accent: string
  buttonLabel: string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick()
      }}
      className={`motion-safe:animate-[fade-rise_0.3s_ease-out_both] relative flex cursor-pointer flex-col rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-elev md:p-5 ${
        active ? `${accent} shadow-elev` : 'bg-surface shadow-card'
      }`}
    >
      {active && tag && (
        <span className="absolute right-3 top-3 rounded-full bg-white/25 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
          {tag}
        </span>
      )}
      <div className="flex items-center gap-3.5 md:flex-col md:items-start md:gap-0">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white md:mb-3 ${
            active ? 'bg-white/25' : accent
          }`}
        >
          <Icon name={icon} className="icon !h-[21px] !w-[21px]" />
        </span>
        <span className="min-w-0 flex-1 md:flex-none">
          <span className={`block text-[14.5px] font-bold ${active ? 'text-white' : 'text-heading'}`}>{title}</span>
          <span className={`mt-0.5 block text-[12px] leading-snug ${active ? 'text-white/85' : 'text-slate'}`}>
            {description}
          </span>
          <span
            className={`mt-2 flex items-center gap-1.5 text-[11px] font-semibold ${
              active ? 'text-white' : 'text-brass-deep'
            }`}
          >
            <Icon name={active ? 'bell' : 'clock'} className="icon !h-[11px] !w-[11px]" />
            {meta}
          </span>
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={`mt-3.5 w-full rounded-full py-2.5 text-[12px] font-bold transition-transform hover:scale-[1.02] ${
          active ? 'bg-white text-heading' : `${accent} text-white hover:brightness-110`
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <Card className="p-6 text-center">
      <p className="text-[12.5px] text-slate">{text}</p>
    </Card>
  )
}
