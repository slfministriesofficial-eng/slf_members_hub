import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Skeleton } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { deriveBirthdays, deriveAnniversaries, deriveNewMembers } from '../utils/celebrations'

// A simple 3-card navigation dashboard — the actual member lists (with search
// and filters) live on their own dedicated pages at /birthdays/:type.
export function BirthdaysScreen() {
  const { members, isLoading, isError } = useMembers()
  const navigate = useNavigate()

  const birthdays = useMemo(() => deriveBirthdays(members), [members])
  const anniversaries = useMemo(() => deriveAnniversaries(members), [members])
  const newMembers = useMemo(() => deriveNewMembers(members), [members])

  const upcomingBirthdays = birthdays.filter((e) => e.daysAway <= 30).length
  const upcomingAnniversaries = anniversaries.filter((e) => e.daysAway <= 30).length
  const recentNewMembers = newMembers.filter((e) => e.daysAgo <= 30).length

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <div className="mb-6">
        <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">
          Birthdays &amp; Anniversaries
        </h1>
        <p className="mt-1 text-[12.5px] text-slate">
          Celebrate and bless our church family on their special occasions.
        </p>
      </div>

      {isError && (
        <p className="py-8 text-center text-[13px] text-slate">Could not load members — check your connection.</p>
      )}

      {!isError && isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )}

      {!isError && !isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NavCard
            icon="cake"
            title="Birthdays"
            count={upcomingBirthdays}
            caption="Upcoming — Next 30 Days"
            onClick={() => navigate('/birthdays/birthdays')}
          />
          <NavCard
            icon="rings"
            title="Anniversaries"
            count={upcomingAnniversaries}
            caption="Upcoming — Next 30 Days"
            onClick={() => navigate('/birthdays/anniversaries')}
          />
          <NavCard
            icon="users"
            title="New Members"
            count={recentNewMembers}
            caption="Joined — Last 30 Days"
            onClick={() => navigate('/birthdays/new-members')}
          />
        </div>
      )}
    </div>
  )
}

function NavCard({
  icon,
  title,
  count,
  caption,
  onClick,
}: {
  icon: string
  title: string
  count: number
  caption: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="motion-safe:animate-[fade-rise_0.3s_ease-out_both] flex flex-col items-center rounded-2xl bg-surface p-6 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elev"
    >
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep text-white shadow-md">
        <Icon name={icon} className="icon !h-6 !w-6" />
      </span>
      <h2 className="font-display text-[16px] font-bold text-heading">{title}</h2>
      <div className="mt-1 font-display text-[28px] font-bold text-brass-deep">{count}</div>
      <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate">{caption}</p>
    </button>
  )
}
