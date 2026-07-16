import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { MemberCard } from '../features/members/MemberCard'
import { SendWishModal } from '../features/members/SendWishModal'
import {
  deriveBirthdays,
  deriveAnniversaries,
  deriveNewMembers,
  isSameCalendarMonth,
  formatUpcomingLabel,
  formatPastLabel,
} from '../utils/celebrations'
import {
  openWhatsappWithText,
  buildBirthdayMessage,
  buildAnniversaryMessage,
  buildNewMemberWelcomeMessage,
  BIRTHDAY_TEMPLATES,
  ANNIVERSARY_TEMPLATES,
  NEW_MEMBER_TEMPLATES,
} from '../features/members/whatsapp'
import type { Member } from '../mock/types'

type ListType = 'birthdays' | 'anniversaries' | 'new-members'
type FilterKey = 'today' | 'week' | 'month' | 'completed' | 'all'
type ViewMode = 'list' | 'grid'
type Wish = { kind: 'birthday'; member: Member } | { kind: 'anniversary'; member: Member } | { kind: 'welcome'; member: Member }

const VIEW_STORAGE_KEY = 'slf-celebrations-view'

function getInitialView(): ViewMode {
  if (typeof window === 'undefined') return 'list'
  return window.sessionStorage.getItem(VIEW_STORAGE_KEY) === 'grid' ? 'grid' : 'list'
}

const PAGE_META: Record<ListType, { title: string; icon: string; emptyText: string }> = {
  birthdays: { title: 'Birthdays', icon: 'cake', emptyText: 'No birthdays match.' },
  anniversaries: { title: 'Anniversaries', icon: 'rings', emptyText: 'No anniversaries match.' },
  'new-members': { title: 'New Members', icon: 'users', emptyText: 'No new members match.' },
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function matchesSearch(member: Member, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  return member.name.toLowerCase().includes(q) || normalize(member.memberId).includes(normalize(query))
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CelebrationListScreen() {
  const { type: rawType } = useParams<{ type: string }>()
  const type: ListType = rawType === 'anniversaries' || rawType === 'new-members' ? rawType : 'birthdays'
  const navigate = useNavigate()
  const { members, isLoading, isError } = useMembers()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [view, setView] = useState<ViewMode>(getInitialView)
  const [wish, setWish] = useState<Wish | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  // Tracks who's already been wished this visit — no backend field for it,
  // so it's a same-session "done" marker rather than a persisted record.
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  function changeView(next: ViewMode) {
    setView(next)
    window.sessionStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const meta = PAGE_META[type]
  const now = useMemo(() => new Date(), [])

  const birthdays = useMemo(() => deriveBirthdays(members), [members])
  const anniversaries = useMemo(() => deriveAnniversaries(members), [members])
  const newMembers = useMemo(() => deriveNewMembers(members), [members])

  const filteredBirthdays = useMemo(() => {
    if (type !== 'birthdays') return []
    return birthdays.filter((e) => matchesSearch(e.member, query)).filter((e) => {
      switch (filter) {
        case 'today':
          return e.daysAway === 0
        case 'week':
          return e.daysAway >= 0 && e.daysAway <= 7
        case 'month':
          return e.isThisMonth
        case 'completed':
          return completedIds.has(e.member.id)
        default:
          return true
      }
    })
  }, [type, birthdays, query, filter, completedIds])

  const filteredAnniversaries = useMemo(() => {
    if (type !== 'anniversaries') return []
    return anniversaries.filter((e) => matchesSearch(e.member, query)).filter((e) => {
      switch (filter) {
        case 'today':
          return e.daysAway === 0
        case 'week':
          return e.daysAway >= 0 && e.daysAway <= 7
        case 'month':
          return e.isThisMonth
        case 'completed':
          return completedIds.has(e.member.id)
        default:
          return true
      }
    })
  }, [type, anniversaries, query, filter, completedIds])

  const filteredNewMembers = useMemo(() => {
    if (type !== 'new-members') return []
    return newMembers.filter((e) => matchesSearch(e.member, query)).filter((e) => {
      switch (filter) {
        case 'today':
          return e.daysAgo === 0
        case 'week':
          return e.daysAgo <= 7
        case 'month':
          return isSameCalendarMonth(e.joinedDate, now)
        case 'completed':
          return completedIds.has(e.member.id)
        default:
          return true
      }
    })
  }, [type, newMembers, query, filter, now, completedIds])

  const isEmpty =
    (type === 'birthdays' && filteredBirthdays.length === 0) ||
    (type === 'anniversaries' && filteredAnniversaries.length === 0) ||
    (type === 'new-members' && filteredNewMembers.length === 0)

  function sendWish(kind: Wish['kind'], member: Member, number: string, message: string) {
    openWhatsappWithText(number, message)
    setWish(null)
    setCompletedIds((prev) => new Set(prev).add(member.id))
    const label = kind === 'birthday' ? 'Birthday wish' : kind === 'anniversary' ? 'Anniversary wish' : 'Welcome message'
    setToast(`${label} opened in WhatsApp for ${member.name}.`)
  }

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      {/* HEADER + BACK */}
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate('/birthdays')}
          aria-label="Back to Birthdays & Anniversaries"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface shadow-card transition-colors hover:bg-paper"
        >
          <Icon name="chevron" className="icon !h-[15px] !w-[15px] rotate-180 text-heading" />
        </button>
        <div>
          <h1 className="flex items-center gap-2 font-display text-[20px] font-bold text-heading md:text-[24px]">
            <Icon name={meta.icon} className="icon !h-[18px] !w-[18px] text-brass-deep" />
            {meta.title}
          </h1>
          <p className="mt-0.5 text-[11.5px] text-slate">Birthdays &amp; Anniversaries</p>
        </div>
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
            <div className={view === 'grid' ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3'}>
              {type === 'birthdays' &&
                filteredBirthdays.map((e) => (
                  <MemberCard
                    key={e.member.id}
                    member={e.member}
                    type="birthday"
                    dateLabel="Birthday"
                    dateValue={formatDate(e.nextDate)}
                    subLabel={e.age !== null ? `${e.age} yrs` : undefined}
                    countdownLabel={formatUpcomingLabel(e.nextDate, now)}
                    completed={completedIds.has(e.member.id)}
                    onView={() => navigate(`/members/${e.member.id}`)}
                    onSend={() => setWish({ kind: 'birthday', member: e.member })}
                    sendLabel="Send Birthday Wish"
                  />
                ))}

              {type === 'anniversaries' &&
                filteredAnniversaries.map((e) => (
                  <MemberCard
                    key={e.member.id}
                    member={e.member}
                    type="anniversary"
                    dateLabel="Anniversary"
                    dateValue={formatDate(e.nextDate)}
                    subLabel={e.yearsMarried !== null ? `${e.yearsMarried} yrs married` : undefined}
                    coupleName={e.member.spouse}
                    countdownLabel={formatUpcomingLabel(e.nextDate, now)}
                    completed={completedIds.has(e.member.id)}
                    onView={() => navigate(`/members/${e.member.id}`)}
                    onSend={() => setWish({ kind: 'anniversary', member: e.member })}
                    sendLabel="Send Anniversary Wish"
                  />
                ))}

              {type === 'new-members' &&
                filteredNewMembers.map((e) => (
                  <MemberCard
                    key={e.member.id}
                    member={e.member}
                    type="new-member"
                    dateLabel="Joined"
                    dateValue={formatDate(e.joinedDate)}
                    countdownLabel={formatPastLabel(e.joinedDate, now)}
                    completed={completedIds.has(e.member.id)}
                    onView={() => navigate(`/members/${e.member.id}`)}
                    onSend={() => setWish({ kind: 'welcome', member: e.member })}
                    sendLabel="Send Welcome Message"
                  />
                ))}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-8 motion-safe:animate-[fade-rise_0.3s_ease-out]">
          <div className="flex max-w-[92vw] items-center gap-2 rounded-full bg-ink-deep px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-elev">
            <Icon name="chat" className="icon !h-[14px] !w-[14px] shrink-0 text-white" />
            <span className="truncate">{toast}</span>
          </div>
        </div>
      )}

      {wish?.kind === 'birthday' && (
        <SendWishModal
          member={wish.member}
          icon="cake"
          title="Send Birthday Wish"
          templates={BIRTHDAY_TEMPLATES}
          buildMessage={buildBirthdayMessage}
          onCancel={() => setWish(null)}
          onSend={(message, number) => sendWish('birthday', wish.member, number, message)}
        />
      )}
      {wish?.kind === 'anniversary' && (
        <SendWishModal
          member={wish.member}
          icon="rings"
          title="Send Anniversary Wish"
          templates={ANNIVERSARY_TEMPLATES}
          buildMessage={buildAnniversaryMessage}
          onCancel={() => setWish(null)}
          onSend={(message, number) => sendWish('anniversary', wish.member, number, message)}
        />
      )}
      {wish?.kind === 'welcome' && (
        <SendWishModal
          member={wish.member}
          icon="heart"
          title="Send Welcome Message"
          templates={NEW_MEMBER_TEMPLATES}
          buildMessage={buildNewMemberWelcomeMessage}
          onCancel={() => setWish(null)}
          onSend={(message, number) => sendWish('welcome', wish.member, number, message)}
        />
      )}
    </div>
  )
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface p-1 shadow-card">
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
