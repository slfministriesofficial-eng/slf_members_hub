import { useMemo } from 'react'
import { IconButton } from '../components/ui/IconButton'
import { Skeleton } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { getUpcomingDates } from '../utils/upcomingDates'

function SkeletonBirthdayRow() {
  return (
    <div className="mb-2 flex items-center justify-between rounded-2xl bg-surface px-3.5 py-3 shadow-card">
      <div>
        <Skeleton className="h-[13px] w-32 rounded" />
        <Skeleton className="mt-1.5 h-[11.5px] w-20 rounded" />
      </div>
      <Skeleton className="h-[12px] w-14 rounded" />
    </div>
  )
}

export function BirthdaysScreen() {
  const { members, isLoading, isError } = useMembers()
  const upcoming = useMemo(() => getUpcomingDates(members, 30), [members])

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <h1 className="font-display text-[20px] font-bold text-heading">Birthdays &amp; Anniversaries</h1>
        <IconButton icon="cake" />
      </div>

      {isLoading ? (
        <>
          <SkeletonBirthdayRow />
          <SkeletonBirthdayRow />
          <SkeletonBirthdayRow />
        </>
      ) : isError ? (
        <p className="py-4 text-center text-[12.5px] text-slate">
          Could not load — check your connection.
        </p>
      ) : upcoming.length === 0 ? (
        <p className="py-4 text-center text-[12.5px] text-slate">
          Nothing coming up in the next 30 days.
        </p>
      ) : (
        upcoming.map((item) => (
          <div
            key={item.id}
            className="mb-2 flex items-center justify-between rounded-2xl bg-surface px-3.5 py-3 shadow-card"
          >
            <div>
              <div className="text-[13px] font-bold text-heading">{item.who}</div>
              <div className="text-[11.5px] text-slate">{item.what}</div>
            </div>
            <span className="font-mono text-[12px] font-bold text-brass-deep">
              {item.day} {item.month}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
