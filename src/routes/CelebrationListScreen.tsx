import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  formatPastLabel,
  isSameCalendarMonth,
  dateParts,
  type BirthdayEntry,
  type AnniversaryEntry,
  type AnnualEventEntry,
  type NewMemberEntry,
} from '../utils/celebrations'
import { useCompletedWishes, type WishOccasion } from '../utils/completedWishes'
import type { Member } from '../mock/types'

type ListType = 'birthdays' | 'anniversaries' | 'baptisms' | 'membership' | 'visitors'
type FilterKey = 'all' | 'week' | 'month' | 'completed'
type ViewMode = 'list' | 'grid'

const VIEW_STORAGE_KEY = 'slf-celebrations-view'

function getInitialView(): ViewMode {
  if (typeof window === 'undefined') return 'list'
  return window.sessionStorage.getItem(VIEW_STORAGE_KEY) === 'grid' ? 'grid' : 'list'
}

const PAGE_META: Record<ListType, { title: string; icon: string; accent: string; noun: string; emptyText: string }> = {
  birthdays: { title: 'Birthdays', icon: 'cake', accent: 'text-tint-amber-fg', noun: 'Birthdays', emptyText: 'No birthdays match.' },
  anniversaries: {
    title: 'Anniversaries',
    icon: 'rings',
    accent: 'text-tint-pink-fg',
    noun: 'Anniversaries',
    emptyText: 'No anniversaries match.',
  },
  baptisms: {
    title: 'Baptism Anniversaries',
    icon: 'cross',
    accent: 'text-tint-blue-fg',
    noun: 'Baptisms',
    emptyText: 'No baptism anniversaries match.',
  },
  membership: {
    title: 'Membership Anniversaries',
    icon: 'heart',
    accent: 'text-tint-purple-fg',
    noun: 'Membership',
    emptyText: 'No membership anniversaries match.',
  },
  visitors: {
    title: 'First-Time Visitors',
    icon: 'user',
    accent: 'text-tint-green-fg',
    noun: 'First Visits',
    emptyText: 'No first-time visitors match.',
  },
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'completed', label: 'Completed' },
]

function topTitleFor(filter: FilterKey, noun: string): string {
  switch (filter) {
    case 'week':
      return `This Week's ${noun}`
    case 'month':
      return `This Month's ${noun}`
    case 'completed':
      return 'Completed'
    default:
      return `Today's ${noun}`
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function matchesSearch(member: Member, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return member.name.toLowerCase().includes(q) || normalize(member.memberId).includes(normalize(query))
}

export function CelebrationListScreen() {
  const { type: rawType } = useParams<{ type: string }>()
  const type: ListType =
    rawType === 'anniversaries' || rawType === 'baptisms' || rawType === 'membership' || rawType === 'visitors'
      ? rawType
      : 'birthdays'
  const navigate = useNavigate()
  const { members, isLoading, isError } = useMembers()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view, setView] = useState<ViewMode>(getInitialView)
  // Who's already been wished this year — backend-backed and shared across
  // devices (see completedWishes); refreshes live when a wish is sent. Tracked
  // per occasion, so this list's own occasion is what each check uses.
  const isWished = useCompletedWishes()

  function changeView(next: ViewMode) {
    setView(next)
    window.sessionStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const meta = PAGE_META[type]
  const now = useMemo(() => new Date(), [])

  const birthdays = useMemo(() => deriveBirthdays(members), [members])
  const anniversaries = useMemo(() => deriveAnniversaries(members), [members])
  // Baptism/membership anniversaries share one deriver, shaped to carry the
  // same isThisMonth flag the filter chips need.
  const baptisms = useMemo(
    () =>
      deriveAnnualEvents(members)
        .filter((e) => e.kind === 'baptism')
        .map((e) => ({ ...e, isThisMonth: isSameCalendarMonth(e.nextDate, now) })),
    [members, now],
  )
  const membershipAnnivs = useMemo(
    () =>
      deriveAnnualEvents(members)
        .filter((e) => e.kind === 'membership')
        .map((e) => ({ ...e, isThisMonth: isSameCalendarMonth(e.nextDate, now) })),
    [members, now],
  )
  // First visits are a one-time PAST event — filters reinterpret onto daysAgo.
  const visitors = useMemo(
    () => deriveNewMembers(members).filter((e) => e.member.firstTimeVisiting),
    [members],
  )

  // Once wished, someone drops off every filter except "Completed" itself —
  // reviewing who's done lives there instead of a badge on the pending view.
  function matchesFilter<T extends { daysAway: number; isThisMonth: boolean; member: Member }>(
    e: T,
    occasion: WishOccasion,
  ): boolean {
    if (filter === 'completed') return isWished(e.member.id, occasion)
    if (isWished(e.member.id, occasion)) return false
    switch (filter) {
      case 'week':
        return e.daysAway >= 0 && e.daysAway <= 7
      case 'month':
        return e.isThisMonth
      default:
        return e.daysAway === 0
    }
  }

  const topBirthdays = useMemo(
    () => birthdays.filter((e) => matchesSearch(e.member, query)).filter((e) => matchesFilter(e, 'birthday')),
    [birthdays, query, filter, isWished],
  )
  const topAnniversaries = useMemo(
    () => anniversaries.filter((e) => matchesSearch(e.member, query)).filter((e) => matchesFilter(e, 'wedding')),
    [anniversaries, query, filter, isWished],
  )

  // Always-visible forward-looking section — everyone within 60 days who
  // isn't already shown in the top (filtered) section above, so nobody
  // appears twice regardless of which chip is active.
  const upcomingBirthdays = useMemo(() => {
    if (filter === 'completed') return []
    const topIds = new Set(topBirthdays.map((e) => e.member.id))
    return birthdays
      .filter((e) => matchesSearch(e.member, query))
      .filter((e) => e.daysAway > 0 && e.daysAway <= 60 && !topIds.has(e.member.id) && !isWished(e.member.id, 'birthday'))
  }, [birthdays, query, filter, topBirthdays, isWished])

  const upcomingAnniversaries = useMemo(() => {
    if (filter === 'completed') return []
    const topIds = new Set(topAnniversaries.map((e) => e.member.id))
    return anniversaries
      .filter((e) => matchesSearch(e.member, query))
      .filter((e) => e.daysAway > 0 && e.daysAway <= 60 && !topIds.has(e.member.id) && !isWished(e.member.id, 'wedding'))
  }, [anniversaries, query, filter, topAnniversaries, isWished])

  const topBaptisms = useMemo(
    () => baptisms.filter((e) => matchesSearch(e.member, query)).filter((e) => matchesFilter(e, 'baptism')),
    [baptisms, query, filter, isWished],
  )
  const upcomingBaptisms = useMemo(() => {
    if (filter === 'completed') return []
    const topIds = new Set(topBaptisms.map((e) => e.member.id))
    return baptisms
      .filter((e) => matchesSearch(e.member, query))
      .filter((e) => e.daysAway > 0 && e.daysAway <= 60 && !topIds.has(e.member.id) && !isWished(e.member.id, 'baptism'))
  }, [baptisms, query, filter, topBaptisms, isWished])

  const topMembership = useMemo(
    () => membershipAnnivs.filter((e) => matchesSearch(e.member, query)).filter((e) => matchesFilter(e, 'membership')),
    [membershipAnnivs, query, filter, isWished],
  )
  const upcomingMembership = useMemo(() => {
    if (filter === 'completed') return []
    const topIds = new Set(topMembership.map((e) => e.member.id))
    return membershipAnnivs
      .filter((e) => matchesSearch(e.member, query))
      .filter((e) => e.daysAway > 0 && e.daysAway <= 60 && !topIds.has(e.member.id) && !isWished(e.member.id, 'membership'))
  }, [membershipAnnivs, query, filter, topMembership, isWished])

  // Visitors look BACKWARD: today / last 7 days / this calendar month.
  const topVisitors = useMemo(() => {
    return visitors
      .filter((e) => matchesSearch(e.member, query))
      .filter((e) => {
        if (filter === 'completed') return isWished(e.member.id, 'visitor')
        if (isWished(e.member.id, 'visitor')) return false
        switch (filter) {
          case 'week':
            return e.daysAgo <= 7
          case 'month':
            return isSameCalendarMonth(e.joinedDate, now)
          default:
            return e.daysAgo === 0
        }
      })
  }, [visitors, query, filter, isWished, now])
  const recentVisitors = useMemo(() => {
    if (filter === 'completed') return []
    const topIds = new Set(topVisitors.map((e) => e.member.id))
    return visitors
      .filter((e) => matchesSearch(e.member, query))
      .filter((e) => e.daysAgo > 0 && e.daysAgo <= 60 && !topIds.has(e.member.id) && !isWished(e.member.id, 'visitor'))
  }, [visitors, query, filter, topVisitors, isWished])

  const isEmpty =
    (type === 'birthdays' && topBirthdays.length === 0 && upcomingBirthdays.length === 0) ||
    (type === 'anniversaries' && topAnniversaries.length === 0 && upcomingAnniversaries.length === 0) ||
    (type === 'baptisms' && topBaptisms.length === 0 && upcomingBaptisms.length === 0) ||
    (type === 'membership' && topMembership.length === 0 && upcomingMembership.length === 0) ||
    (type === 'visitors' && topVisitors.length === 0 && recentVisitors.length === 0)

  function renderBirthdayCard(e: BirthdayEntry) {
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
  }

  function renderAnniversaryCard(e: AnniversaryEntry) {
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
  }

  // Baptism/membership have no dedicated wish flow — View opens the full
  // profile and Send opens the general custom-message composer.
  function renderAnnualCard(e: AnnualEventEntry & { isThisMonth: boolean }, cardType: 'baptism' | 'membership') {
    const { day, month } = dateParts(e.nextDate)
    return (
      <MemberCard
        key={e.member.id}
        member={e.member}
        type={cardType}
        dateDay={day}
        dateMonth={month}
        subLabel={e.years !== null ? `${e.years} yr${e.years === 1 ? '' : 's'}` : undefined}
        countdownLabel={formatUpcomingLabel(e.nextDate, now)}
        completed={isWished(e.member.id, cardType)}
        onView={() => navigate(`/members/${e.member.id}`)}
        onSend={() => navigate(`/send-wish/custom/${e.member.id}?occasion=${cardType}`)}
        sendLabel="Send Wishes"
      />
    )
  }

  function renderVisitorCard(e: NewMemberEntry) {
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
  }

  const listClass = view === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3'

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      {/* HEADER + CLOSE */}
      <div className="relative mb-5 flex items-center justify-center px-9">
        <h1 className="flex items-center gap-2 font-display text-[19px] font-bold text-heading md:text-[24px]">
          <Icon name={meta.icon} className={`icon !h-[18px] !w-[18px] shrink-0 ${meta.accent}`} />
          {meta.title}
        </h1>
        <button
          onClick={() => navigate('/birthdays')}
          aria-label="Close"
          className="absolute right-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:text-heading"
        >
          <Icon name="x" className="icon !h-[17px] !w-[17px]" />
        </button>
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
          {/* SEARCH */}
          <div className="relative mb-3">
            <Icon
              name="search"
              className="icon !h-[14px] !w-[14px] pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or member ID…"
              className="w-full rounded-full border border-hairline bg-surface py-3 pl-10 pr-4 text-[13px] text-heading outline-none placeholder:text-slate focus:border-ink"
            />
          </div>

          {/* FILTERS + VIEW TOGGLE */}
          <div className="mb-5 flex items-center gap-2">
            <div className="flex flex-1 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <ViewToggle view={view} onChange={changeView} />
          </div>

          {isEmpty ? (
            <Card className="p-8 text-center">
              <p className="text-[12.5px] text-slate">{meta.emptyText}</p>
            </Card>
          ) : (
            <div className="space-y-7">
              {type === 'birthdays' && (
                <>
                  <section>
                    <h2 className="mb-3 text-[13px] font-bold text-heading">
                      {topTitleFor(filter, 'Birthdays')} ({topBirthdays.length})
                    </h2>
                    {topBirthdays.length === 0 ? (
                      <Card className="p-6 text-center">
                        <p className="text-[12px] text-slate">Nobody matches this filter.</p>
                      </Card>
                    ) : (
                      <div className={listClass}>{topBirthdays.map((e) => renderBirthdayCard(e))}</div>
                    )}
                  </section>

                  {filter !== 'completed' && upcomingBirthdays.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-[13px] font-bold text-heading">Upcoming Birthdays</h2>
                      <div className={listClass}>{upcomingBirthdays.map((e) => renderBirthdayCard(e))}</div>
                    </section>
                  )}
                </>
              )}

              {type === 'anniversaries' && (
                <>
                  <section>
                    <h2 className="mb-3 text-[13px] font-bold text-heading">
                      {topTitleFor(filter, 'Anniversaries')} ({topAnniversaries.length})
                    </h2>
                    {topAnniversaries.length === 0 ? (
                      <Card className="p-6 text-center">
                        <p className="text-[12px] text-slate">Nobody matches this filter.</p>
                      </Card>
                    ) : (
                      <div className={listClass}>{topAnniversaries.map((e) => renderAnniversaryCard(e))}</div>
                    )}
                  </section>

                  {filter !== 'completed' && upcomingAnniversaries.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-[13px] font-bold text-heading">Upcoming Anniversaries</h2>
                      <div className={listClass}>{upcomingAnniversaries.map((e) => renderAnniversaryCard(e))}</div>
                    </section>
                  )}
                </>
              )}

              {type === 'baptisms' && (
                <>
                  <section>
                    <h2 className="mb-3 text-[13px] font-bold text-heading">
                      {topTitleFor(filter, 'Baptisms')} ({topBaptisms.length})
                    </h2>
                    {topBaptisms.length === 0 ? (
                      <Card className="p-6 text-center">
                        <p className="text-[12px] text-slate">Nobody matches this filter.</p>
                      </Card>
                    ) : (
                      <div className={listClass}>{topBaptisms.map((e) => renderAnnualCard(e, 'baptism'))}</div>
                    )}
                  </section>

                  {filter !== 'completed' && upcomingBaptisms.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-[13px] font-bold text-heading">Upcoming Baptism Anniversaries</h2>
                      <div className={listClass}>{upcomingBaptisms.map((e) => renderAnnualCard(e, 'baptism'))}</div>
                    </section>
                  )}
                </>
              )}

              {type === 'membership' && (
                <>
                  <section>
                    <h2 className="mb-3 text-[13px] font-bold text-heading">
                      {topTitleFor(filter, 'Membership')} ({topMembership.length})
                    </h2>
                    {topMembership.length === 0 ? (
                      <Card className="p-6 text-center">
                        <p className="text-[12px] text-slate">Nobody matches this filter.</p>
                      </Card>
                    ) : (
                      <div className={listClass}>{topMembership.map((e) => renderAnnualCard(e, 'membership'))}</div>
                    )}
                  </section>

                  {filter !== 'completed' && upcomingMembership.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-[13px] font-bold text-heading">Upcoming Membership Anniversaries</h2>
                      <div className={listClass}>{upcomingMembership.map((e) => renderAnnualCard(e, 'membership'))}</div>
                    </section>
                  )}
                </>
              )}

              {type === 'visitors' && (
                <>
                  <section>
                    <h2 className="mb-3 text-[13px] font-bold text-heading">
                      {topTitleFor(filter, 'First Visits')} ({topVisitors.length})
                    </h2>
                    {topVisitors.length === 0 ? (
                      <Card className="p-6 text-center">
                        <p className="text-[12px] text-slate">Nobody matches this filter.</p>
                      </Card>
                    ) : (
                      <div className={listClass}>{topVisitors.map((e) => renderVisitorCard(e))}</div>
                    )}
                  </section>

                  {filter !== 'completed' && recentVisitors.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-[13px] font-bold text-heading">Recent First Visits</h2>
                      <div className={listClass}>{recentVisitors.map((e) => renderVisitorCard(e))}</div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

    </div>
  )
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="hidden shrink-0 items-center gap-1 rounded-full bg-surface p-1 shadow-card md:flex">
      <button
        onClick={() => onChange('list')}
        aria-label="List view"
        aria-pressed={view === 'list'}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          view === 'list' ? 'bg-ink-deep text-white' : 'text-slate hover:bg-paper'
        }`}
      >
        <Icon name="menu" className="icon !h-[15px] !w-[15px]" />
      </button>
      <button
        onClick={() => onChange('grid')}
        aria-label="Grid view"
        aria-pressed={view === 'grid'}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          view === 'grid' ? 'bg-ink-deep text-white' : 'text-slate hover:bg-paper'
        }`}
      >
        <Icon name="grid" className="icon !h-[15px] !w-[15px]" />
      </button>
    </div>
  )
}
