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
  formatUpcomingLabel,
  dateParts,
  type BirthdayEntry,
  type AnniversaryEntry,
} from '../utils/celebrations'
import { getCompletedIds } from '../utils/completedWishes'
import type { Member } from '../mock/types'

type ListType = 'birthdays' | 'anniversaries'
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
  const type: ListType = rawType === 'anniversaries' ? 'anniversaries' : 'birthdays'
  const navigate = useNavigate()
  const { members, isLoading, isError } = useMembers()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view, setView] = useState<ViewMode>(getInitialView)
  // Tracks who's already been wished — persisted in sessionStorage (no
  // backend field for this) so it survives navigating to the Send Wish page
  // and back, not just local state that would reset on remount.
  const [completedIds] = useState<Set<string>>(getCompletedIds)

  function changeView(next: ViewMode) {
    setView(next)
    window.sessionStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const meta = PAGE_META[type]
  const now = useMemo(() => new Date(), [])

  const birthdays = useMemo(() => deriveBirthdays(members), [members])
  const anniversaries = useMemo(() => deriveAnniversaries(members), [members])

  // Once wished, someone drops off every filter except "Completed" itself —
  // reviewing who's done lives there instead of a badge on the pending view.
  function matchesFilter<T extends { daysAway: number; isThisMonth: boolean; member: Member }>(e: T): boolean {
    if (filter === 'completed') return completedIds.has(e.member.id)
    if (completedIds.has(e.member.id)) return false
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
    () => birthdays.filter((e) => matchesSearch(e.member, query)).filter(matchesFilter),
    [birthdays, query, filter, completedIds],
  )
  const topAnniversaries = useMemo(
    () => anniversaries.filter((e) => matchesSearch(e.member, query)).filter(matchesFilter),
    [anniversaries, query, filter, completedIds],
  )

  // Always-visible forward-looking section — everyone within 60 days who
  // isn't already shown in the top (filtered) section above, so nobody
  // appears twice regardless of which chip is active.
  const upcomingBirthdays = useMemo(() => {
    if (filter === 'completed') return []
    const topIds = new Set(topBirthdays.map((e) => e.member.id))
    return birthdays
      .filter((e) => matchesSearch(e.member, query))
      .filter((e) => e.daysAway > 0 && e.daysAway <= 60 && !topIds.has(e.member.id) && !completedIds.has(e.member.id))
  }, [birthdays, query, filter, topBirthdays, completedIds])

  const upcomingAnniversaries = useMemo(() => {
    if (filter === 'completed') return []
    const topIds = new Set(topAnniversaries.map((e) => e.member.id))
    return anniversaries
      .filter((e) => matchesSearch(e.member, query))
      .filter((e) => e.daysAway > 0 && e.daysAway <= 60 && !topIds.has(e.member.id) && !completedIds.has(e.member.id))
  }, [anniversaries, query, filter, topAnniversaries, completedIds])

  const isEmpty =
    (type === 'birthdays' && topBirthdays.length === 0 && upcomingBirthdays.length === 0) ||
    (type === 'anniversaries' && topAnniversaries.length === 0 && upcomingAnniversaries.length === 0)

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
        completed={completedIds.has(e.member.id)}
        onView={() => navigate(`/celebration-profile/birthday/${e.member.id}`)}
        onSend={() => navigate(`/send-wish/birthday/${e.member.id}`)}
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
        completed={completedIds.has(e.member.id)}
        onView={() => navigate(`/celebration-profile/anniversary/${e.member.id}`)}
        onSend={() => navigate(`/send-wish/anniversary/${e.member.id}`)}
        sendLabel="Send Wishes"
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
