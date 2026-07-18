import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { useMembers } from '../features/members/MembersContext'
import { getRecentActivity } from '../utils/recentActivity'

/**
 * Full "Recent activity" list — the View-all destination from the dashboard.
 * Each row opens that member's profile. Activity is derived from member
 * records (newest registrations first), so the list is as long as the roster.
 */
export function ActivityScreen() {
  const navigate = useNavigate()
  const { members, isLoading, isError } = useMembers()
  // A generous cap that still covers the whole roster in practice.
  const activity = useMemo(() => getRecentActivity(members, 500), [members])

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="Recent Activity" onBack={() => navigate('/')} />
      <p className="-mt-2 mb-4 pl-11 text-[12px] text-slate">Newest members first — tap anyone to open their profile.</p>

      {isError ? (
        <p className="py-6 text-center text-[13px] text-slate">Could not load activity — check your connection.</p>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      ) : activity.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-[12.5px] text-slate">No activity yet.</p>
        </Card>
      ) : (
        <Card className="px-1 py-1">
          {activity.map((item, i) => (
            <button
              key={item.id}
              onClick={() => navigate(`/members/${item.id}`)}
              className={`flex w-full gap-2.5 px-3 py-3 text-left text-[12.5px] transition-colors hover:bg-paper ${
                i < activity.length - 1 ? 'border-b border-hairline' : ''
              }`}
            >
              <div className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-brass" />
              <div className="min-w-0 flex-1">
                {item.text}
                <span className="mt-0.5 block font-mono text-[10.5px] text-slate">{item.time}</span>
              </div>
              <Icon name="chevron" className="icon !h-[13px] !w-[13px] shrink-0 self-center text-faint" />
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}
