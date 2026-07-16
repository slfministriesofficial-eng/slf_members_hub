import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { MemberCard } from '../features/members/MemberCard'
import { deriveBirthdays, deriveAnniversaries, formatUpcomingLabel, dateParts } from '../utils/celebrations'
import { getCompletedIds } from '../utils/completedWishes'
import type { Member } from '../mock/types'

type FilterKey = 'all' | 'birthdays' | 'anniversaries' | 'today' | 'upcoming'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'birthdays', label: 'Birthdays' },
  { key: 'anniversaries', label: 'Anniversaries' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
]

export function BirthdaysScreen() {
  const { members, isLoading, isError } = useMembers()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [anniversariesOpen, setAnniversariesOpen] = useState(false)
  const [completedIds] = useState<Set<string>>(getCompletedIds)

  const now = useMemo(() => new Date(), [])
  const birthdays = useMemo(() => deriveBirthdays(members), [members])
  const anniversaries = useMemo(() => deriveAnniversaries(members), [members])

  const todaysBirthdays = birthdays.filter((e) => e.daysAway === 0)
  const todaysAnniversaries = anniversaries.filter((e) => e.daysAway === 0)

  const searchedBirthdays = birthdays
  const searchedAnniversaries = anniversaries

  // Once wished, someone drops off the pending views entirely (Today/Upcoming/
  // the type filters) rather than just showing a "Completed" badge in place —
  // reviewing who's done lives on the dedicated page's Completed filter instead.
  const upcomingCombined = useMemo(() => {
    type Combined = { key: string; date: Date; kind: 'birthday' | 'anniversary'; member: Member }
    const items: Combined[] = [
      ...searchedBirthdays
        .filter((e) => e.daysAway > 0 && e.daysAway <= 30 && !completedIds.has(e.member.id))
        .map((e) => ({ key: `b-${e.member.id}`, date: e.nextDate, kind: 'birthday' as const, member: e.member })),
      ...searchedAnniversaries
        .filter((e) => e.daysAway > 0 && e.daysAway <= 30 && !completedIds.has(e.member.id))
        .map((e) => ({ key: `a-${e.member.id}`, date: e.nextDate, kind: 'anniversary' as const, member: e.member })),
    ]
    return items.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [searchedBirthdays, searchedAnniversaries, completedIds])

  const showBirthdaysSection = filter === 'all' || filter === 'birthdays' || filter === 'today'
  const showAnniversariesSection = filter === 'all' || filter === 'anniversaries' || filter === 'today'
  const showUpcomingSection = filter === 'upcoming'

  const birthdaysToShow = (
    filter === 'birthdays' ? searchedBirthdays : searchedBirthdays.filter((e) => e.daysAway === 0)
  ).filter((e) => !completedIds.has(e.member.id))
  const anniversariesToShow = (
    filter === 'anniversaries' ? searchedAnniversaries : searchedAnniversaries.filter((e) => e.daysAway === 0)
  ).filter((e) => !completedIds.has(e.member.id))

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

      <div className="mb-6 grid grid-cols-2 gap-2.5 md:gap-3">
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
        <>
          {/* FILTERS */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
                  filter === f.key ? 'bg-ink-deep text-white' : 'bg-surface text-heading shadow-card hover:bg-paper'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {showUpcomingSection && (
              <section>
                <h2 className="mb-3 text-[13px] font-bold text-heading">Upcoming (Next 30 Days)</h2>
                {upcomingCombined.length === 0 ? (
                  <EmptyRow text="Nothing coming up in the next 30 days." />
                ) : (
                  <div className="space-y-2">
                    {upcomingCombined.map((item) => {
                      const { day, month } = dateParts(item.date)
                      return (
                        <div
                          key={item.key}
                          onClick={() => navigate(`/celebration-profile/${item.kind}/${item.member.id}`)}
                          role="button"
                          tabIndex={0}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card transition-shadow hover:shadow-elev"
                        >
                          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-hairline bg-paper">
                            <span className="font-display text-[13px] font-bold leading-none text-heading">{day}</span>
                            <span className="mt-0.5 text-[8.5px] font-bold uppercase text-slate">{month}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13.5px] font-bold text-heading">{item.member.name}</div>
                            <div className="text-[11px] text-slate">
                              {item.kind === 'birthday' ? 'Birthday' : 'Anniversary'}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-paper-2 px-2.5 py-1 text-[10.5px] font-bold text-slate">
                            {formatUpcomingLabel(item.date, now)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {showBirthdaysSection && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 text-[13px] font-bold text-heading">
                    <Icon name="cake" className="icon !h-[14px] !w-[14px] text-tint-amber-fg" />
                    {filter === 'birthdays' ? 'Birthdays' : "Today's Birthdays"} ({birthdaysToShow.length})
                  </h2>
                  <button
                    onClick={() => navigate('/birthdays/birthdays')}
                    className="text-[11.5px] font-bold text-brass-deep hover:underline"
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
                          completed={completedIds.has(e.member.id)}
                          onView={() => navigate(`/celebration-profile/birthday/${e.member.id}`)}
                          onSend={() => navigate(`/send-wish/birthday/${e.member.id}`)}
                          sendLabel="Send Wishes"
                        />
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {showAnniversariesSection && (
              <section>
                <button
                  onClick={() => setAnniversariesOpen((o) => !o)}
                  className="flex w-full items-center justify-between rounded-2xl bg-surface p-4 shadow-card"
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-heading">
                    <Icon name="rings" className="icon !h-[14px] !w-[14px] text-tint-pink-fg" />
                    {filter === 'anniversaries' ? 'Anniversaries' : "Today's Anniversaries"} ({anniversariesToShow.length})
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
                              completed={completedIds.has(e.member.id)}
                              onView={() => navigate(`/celebration-profile/anniversary/${e.member.id}`)}
                              onSend={() => navigate(`/send-wish/anniversary/${e.member.id}`)}
                              sendLabel="Send Wishes"
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </>
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
        className={`mt-3 w-full rounded-full py-2 text-[11.5px] font-bold text-white transition-transform hover:scale-[1.02] ${buttonAccent}`}
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
