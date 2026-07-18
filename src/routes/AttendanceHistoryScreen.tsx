import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { Dropdown } from '../components/ui/Dropdown'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { useMembers } from '../features/members/MembersContext'
import {
  fetchAttendanceSummary,
  fetchAttendanceForDate,
  fetchAttendanceForMember,
} from '../attendance/api'
import type { Member } from '../mock/types'

type SortKey = 'newest' | 'oldest' | 'most' | 'least'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most', label: 'Most present' },
  { value: 'least', label: 'Least present' },
]

/** Format yyyy-MM-dd as "Sun, 12 Jul 2026". */
function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  if (isNaN(d.getTime())) return date
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/** Format yyyy-MM as "July 2026". */
function formatMonth(ym: string): string {
  const d = new Date(`${ym}-01T00:00:00`)
  if (isNaN(d.getTime())) return ym
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Admin attendance history (last ~2 months). Browse by month, sort by date or
 * present-count, or search a member to see exactly which services they made.
 */
export function AttendanceHistoryScreen() {
  const navigate = useNavigate()
  const { members } = useMembers()
  const [month, setMonth] = useState('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [query, setQuery] = useState('')
  const [openDate, setOpenDate] = useState<string | null>(null)

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['attendance-summary'],
    queryFn: fetchAttendanceSummary,
  })

  // Month options come from the dates that actually have records.
  const monthOptions = useMemo(() => {
    const months = new Set((summary ?? []).map((r) => r.date.slice(0, 7)))
    const opts = [...months].sort((a, b) => (a < b ? 1 : -1)).map((m) => ({ value: m, label: formatMonth(m) }))
    return [{ value: 'all', label: 'All months' }, ...opts]
  }, [summary])

  const visibleDates = useMemo(() => {
    let rows = summary ?? []
    if (month !== 'all') rows = rows.filter((r) => r.date.startsWith(month))
    const sorted = [...rows]
    sorted.sort((a, b) => {
      if (sort === 'most') return b.count - a.count
      if (sort === 'least') return a.count - b.count
      if (sort === 'oldest') return a.date < b.date ? -1 : 1
      return a.date < b.date ? 1 : -1 // newest
    })
    return sorted
  }, [summary, month, sort])

  // Member search — match by name or ID against the roster (cap the list).
  const q = query.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!q) return []
    return members
      .filter((m) => m.name.toLowerCase().includes(q) || m.memberId.toLowerCase().includes(q))
      .slice(0, 6)
  }, [members, q])

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="Attendance Data" onBack={() => navigate('/attendance')} />
      <p className="-mt-2 mb-4 pl-11 text-[12px] text-slate">
        The last two months of recorded attendance.
      </p>

      {/* Member search */}
      <div className="mb-3 flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-card transition-shadow focus-within:shadow-elev">
        <Icon name="search" className="icon !h-[16px] !w-[16px] text-slate" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a member to see their attendance…"
          className="w-full bg-transparent text-[13px] text-charcoal outline-none placeholder:text-slate"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Clear" className="text-slate hover:text-heading">
            <Icon name="x" className="icon !h-[14px] !w-[14px]" />
          </button>
        )}
      </div>

      {/* Month + sort (hidden while searching a member) */}
      {!q && (
        <div className="mb-4 flex gap-2">
          <Dropdown
            value={month}
            onChange={setMonth}
            options={monthOptions}
            triggerClassName="flex-1 rounded-2xl bg-surface py-2.5 pl-3 pr-2 text-[12px] font-semibold text-heading shadow-card"
          />
          <Dropdown
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            align="right"
            options={SORT_OPTIONS}
            triggerClassName="flex-1 rounded-2xl bg-surface py-2.5 pl-3 pr-2 text-[12px] font-semibold text-heading shadow-card"
          />
        </div>
      )}

      {/* ---------- MEMBER SEARCH RESULTS ---------- */}
      {q ? (
        matches.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-[12.5px] text-slate">No member matches "{query}".</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {matches.map((m) => (
              <MemberAttendanceRow key={m.id} member={m} />
            ))}
          </div>
        )
      ) : (
        <>
          {/* ---------- DATE LIST ---------- */}
          {isLoading && <Skeleton className="h-40 w-full rounded-2xl" />}

          {isError && (
            <Card className="p-5 text-center">
              <p className="text-[12.5px] text-slate">
                Could not load attendance — deploy the latest Apps Script version, then reload.
              </p>
            </Card>
          )}

          {summary && visibleDates.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-[12.5px] text-slate">No attendance recorded for this selection.</p>
            </Card>
          )}

          {visibleDates.length > 0 && (
            <div className="space-y-2.5">
              {visibleDates.map((row) => (
                <DateRow
                  key={row.date}
                  date={row.date}
                  count={row.count}
                  open={openDate === row.date}
                  onToggle={() => setOpenDate(openDate === row.date ? null : row.date)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function DateRow({
  date,
  count,
  open,
  onToggle,
}: {
  date: string
  count: number
  open: boolean
  onToggle: () => void
}) {
  const { data: members, isLoading } = useQuery({
    queryKey: ['attendance-date', date],
    queryFn: () => fetchAttendanceForDate(date),
    enabled: open,
  })

  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-3.5 py-3 text-left">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-tint-green-bg">
          <Icon name="users" className="icon !h-[16px] !w-[16px] text-tint-green-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-heading">{formatDay(date)}</div>
          <div className="text-[11.5px] text-slate">
            {count} member{count === 1 ? '' : 's'} present
          </div>
        </div>
        <Icon
          name="chevron"
          className={`icon !h-[15px] !w-[15px] text-slate transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-hairline bg-paper-2/40 px-3.5 py-2.5">
          {isLoading && <p className="py-2 text-[12px] text-slate">Loading…</p>}
          {members && members.length === 0 && (
            <p className="py-2 text-[12px] text-slate">No members recorded.</p>
          )}
          {members && members.length > 0 && (
            <ul className="space-y-1.5">
              {members.map((m) => (
                <li key={m.memberId} className="flex items-center gap-2 text-[12.5px]">
                  <Icon name="check" className="icon !h-[13px] !w-[13px] shrink-0 text-tint-green-fg" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-charcoal">
                    {m.memberName || m.memberId}
                  </span>
                  {m.markedBy && <span className="shrink-0 text-[10.5px] text-slate">by {m.markedBy}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

/** A matched member with the count + list of dates they were present. */
function MemberAttendanceRow({ member }: { member: Member }) {
  const { data: dates, isLoading } = useQuery({
    queryKey: ['attendance-member', member.memberId],
    queryFn: () => fetchAttendanceForMember(member.memberId),
  })

  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-tint-green-bg">
          <Icon name="user" className="icon !h-[16px] !w-[16px] text-tint-green-fg" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-heading">{member.name}</div>
          <div className="font-mono text-[10.5px] text-slate">{member.memberId}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-[16px] font-bold leading-none text-heading">
            {isLoading ? '—' : (dates?.length ?? 0)}
          </div>
          <div className="text-[9.5px] uppercase tracking-wide text-slate">present</div>
        </div>
      </div>
      {dates && dates.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-hairline pt-2.5">
          {dates.map((d) => (
            <span
              key={d}
              className="rounded-full bg-tint-green-bg px-2.5 py-1 text-[10.5px] font-semibold text-tint-green-fg"
            >
              {formatDay(d)}
            </span>
          ))}
        </div>
      )}
      {dates && dates.length === 0 && !isLoading && (
        <p className="mt-2 text-[11.5px] text-slate">No recorded attendance in the last two months.</p>
      )}
    </Card>
  )
}
