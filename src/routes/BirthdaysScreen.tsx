import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { MemberCard } from '../features/members/MemberCard'
import {
  deriveBirthdays,
  deriveAnniversaries,
  deriveAnnualEvents,
  deriveNewMembers,
  formatUpcomingLabel,
  dateParts,
} from '../utils/celebrations'
import { useCompletedWishes } from '../utils/completedWishes'
import { markCelebrationsSeen } from '../hooks/useAlertCounts'

export function BirthdaysScreen() {
  const { members, isLoading, isError } = useMembers()
  const navigate = useNavigate()
  const [anniversariesOpen, setAnniversariesOpen] = useState(false)
  const isWished = useCompletedWishes()

  const now = useMemo(() => new Date(), [])
  const birthdays = useMemo(() => deriveBirthdays(members), [members])
  const anniversaries = useMemo(() => deriveAnniversaries(members), [members])
  // All four annual kinds in one list — feeds the baptism/membership counts.
  const annualEvents = useMemo(() => deriveAnnualEvents(members), [members])
  const recentVisitors = useMemo(
    () => deriveNewMembers(members).filter((e) => e.member.firstTimeVisiting && e.daysAgo <= 30),
    [members],
  )

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

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <div className="mb-5">
        <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">
          Birthdays &amp; Anniversaries
        </h1>
        <p className="mt-1 text-[12.5px] text-slate">
          Celebrate and bless our church family on their special occasions.
        </p>
      </div>

      {/* FIVE CELEBRATION CARDS — one per event type, same five colors as the
          dashboard's This-week labels. Each opens that type's full-year list. */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-3 xl:grid-cols-5">
        <NavStatCard
          icon="cake"
          label="Birthdays"
          value={isLoading ? '—' : todaysBirthdays.length}
          accent="bg-tint-amber-fg"
          buttonAccent="bg-tint-amber-fg hover:brightness-110"
          buttonLabel="View Birthdays"
          onClick={() => navigate('/birthdays/birthdays')}
        />
        <NavStatCard
          icon="rings"
          label="Anniversaries"
          value={isLoading ? '—' : todaysAnniversaries.length}
          accent="bg-tint-pink-fg"
          buttonAccent="bg-tint-pink-fg hover:brightness-110"
          buttonLabel="View Anniversaries"
          onClick={() => navigate('/birthdays/anniversaries')}
        />
        <NavStatCard
          icon="cross"
          label="Baptisms"
          value={isLoading ? '—' : todaysBaptisms.length}
          accent="bg-tint-blue-fg"
          buttonAccent="bg-tint-blue-fg hover:brightness-110"
          buttonLabel="View Baptisms"
          onClick={() => navigate('/birthdays/baptisms')}
        />
        <NavStatCard
          icon="heart"
          label="Membership"
          value={isLoading ? '—' : todaysMembership.length}
          accent="bg-tint-purple-fg"
          buttonAccent="bg-tint-purple-fg hover:brightness-110"
          buttonLabel="View Membership"
          onClick={() => navigate('/birthdays/membership')}
        />
        <NavStatCard
          icon="user"
          label="First Visits"
          value={isLoading ? '—' : recentVisitors.length}
          accent="bg-tint-green-fg"
          buttonAccent="bg-tint-green-fg hover:brightness-110"
          buttonLabel="View First Visits"
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
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-heading">
                <Icon name="cake" className="icon !h-[14px] !w-[14px] text-tint-amber-fg" />
                Today's Birthdays ({birthdaysToShow.length})
              </h2>
              <button
                onClick={() => navigate('/birthdays/birthdays')}
                className="rounded-full border border-brass-deep px-3.5 py-1.5 text-[11.5px] font-bold text-brass-deep transition-colors hover:bg-brass/10"
              >
                View All
              </button>
            </div>
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
          </section>

          <section>
            <button
              onClick={() => setAnniversariesOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-2xl bg-surface p-4 shadow-card"
            >
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-heading">
                <Icon name="rings" className="icon !h-[14px] !w-[14px] text-tint-pink-fg" />
                Today's Anniversaries ({anniversariesToShow.length})
              </span>
              <Icon
                name="chevron"
                className={`icon !h-[14px] !w-[14px] text-slate transition-transform ${
                  anniversariesOpen ? 'rotate-90' : ''
                }`}
              />
            </button>
            {anniversariesOpen && (
              <div className="mt-3">
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
              </div>
            )}
          </section>
        </div>
      )}

    </div>
  )
}

function NavStatCard({
  icon,
  label,
  value,
  accent,
  buttonAccent,
  buttonLabel,
  onClick,
}: {
  icon: string
  label: string
  value: number | string
  accent: string
  buttonAccent: string
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
      className="motion-safe:animate-[fade-rise_0.3s_ease-out_both] flex cursor-pointer flex-col items-center rounded-2xl bg-surface p-4 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elev md:p-5"
    >
      <span className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full text-white ${accent}`}>
        <Icon name={icon} className="icon !h-[18px] !w-[18px]" />
      </span>
      <div className="font-display text-[22px] font-bold text-heading md:text-[26px]">{value}</div>
      <div className="mt-0.5 text-[11px] font-bold text-heading">{label}</div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={`mt-3 w-full whitespace-nowrap rounded-full px-2 py-2 text-[11px] font-bold text-white transition-transform hover:scale-[1.02] ${buttonAccent}`}
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
