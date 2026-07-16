import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Avatar } from '../components/ui/Avatar'
import { Skeleton } from '../components/ui/Skeleton'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { useMembers } from '../features/members/MembersContext'
import { getAttendanceMarks, togglePresence, type AttendanceMarksMap } from '../utils/attendanceMarks'
import type { Member } from '../mock/types'

const FILTER_CHIPS: { key: 'all' | 'present' | 'absent'; label: string }[] = [
  { key: 'all', label: 'All Members' },
  { key: 'present', label: 'Present' },
  { key: 'absent', label: 'Absent' },
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '')
}

// A focused, searchable "check everyone off" list — separated from the
// summary dashboard (AttendanceScreen) so a volunteer taking attendance gets
// a distraction-free tool: search, a present/absent filter, and one checkbox
// per member. Checking it marks present immediately (no separate save step);
// unchecking marks absent — there's no third "not marked yet" state anymore.
export function AttendanceMarkAllScreen() {
  const { members, isLoading, isError } = useMembers()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filterKey, setFilterKey] = useState<'all' | 'present' | 'absent'>('all')
  const [marks, setMarks] = useState<AttendanceMarksMap>(getAttendanceMarks)

  function toggle(memberId: string) {
    setMarks(togglePresence(memberId))
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qId = normalize(query)
    const qDigits = normalizeDigits(query)
    return members.filter((m) => {
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        normalize(m.memberId).includes(qId) ||
        m.ministry.toLowerCase().includes(q) ||
        (qDigits.length > 0 &&
          (normalizeDigits(m.phone).includes(qDigits) || normalizeDigits(m.whatsapp).includes(qDigits)))
      if (!matchesQuery) return false

      if (filterKey === 'present') return Boolean(marks[m.id])
      if (filterKey === 'absent') return !marks[m.id]
      return true
    })
  }, [members, query, filterKey, marks])

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="All Members" onBack={() => navigate(-1)} />

      <div className="mb-3 flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-card transition-shadow focus-within:shadow-elev">
        <Icon name="search" className="icon !h-[17px] !w-[17px] text-slate" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, ID, phone, WhatsApp, or ministry…"
          className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-slate outline-none"
        />
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTER_CHIPS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterKey(f.key)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
              filterKey === f.key ? 'bg-ink-deep text-white' : 'bg-surface text-heading shadow-card hover:bg-paper'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isError && (
        <p className="py-8 text-center text-[13px] text-slate">Could not load members — check your connection.</p>
      )}

      {!isError && isLoading && (
        <div className="space-y-3">
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
        </div>
      )}

      {!isError && !isLoading && filtered.length === 0 && (
        <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-14 text-center shadow-card">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-2">
            <Icon name="search" className="icon !h-[26px] !w-[26px] text-faint" />
          </span>
          <h3 className="font-display text-[16px] font-bold text-heading">No members found.</h3>
          <p className="max-w-[260px] text-[12.5px] text-slate">Try another search or filter.</p>
        </div>
      )}

      {!isError && !isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              present={Boolean(marks[member.id])}
              onToggle={() => toggle(member.id)}
              onOpenProfile={() => navigate(`/celebration-profile/attendance/${member.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Checkbox({ checked, onChange, ariaLabel }: { checked: boolean; onChange: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className="flex h-10 w-10 shrink-0 items-center justify-center"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-colors ${
          checked ? 'border-status-regular-fg bg-status-regular-fg' : 'border-hairline bg-surface'
        }`}
      >
        {checked && <Icon name="check" className="icon !h-[15px] !w-[15px] text-white" />}
      </span>
    </button>
  )
}

function MemberRow({
  member,
  present,
  onToggle,
  onOpenProfile,
}: {
  member: Member
  present: boolean
  onToggle: () => void
  onOpenProfile: () => void
}) {
  const sinceYear = member.joinDate.slice(-4)

  return (
    <div
      onClick={onOpenProfile}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpenProfile()
      }}
      className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border-l-4 bg-surface p-3 shadow-card transition-shadow active:shadow-elev ${
        present ? 'border-l-status-regular-fg' : 'border-l-hairline'
      }`}
    >
      <Checkbox checked={present} onChange={onToggle} ariaLabel={`Mark ${member.name} present`} />
      <Avatar initials={member.initials} color={member.color} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-heading">{member.name}</div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-slate">
          {member.memberId} • {member.ministry}
        </div>
        <div className="mt-0.5 text-[10.5px] text-slate">Member Since {sinceYear}</div>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
          present ? 'bg-status-regular-bg text-status-regular-fg' : 'bg-status-alert-bg text-status-alert-fg'
        }`}
      >
        {present ? 'Present' : 'Absent'}
      </span>
      <Icon name="chevron" className="icon !h-[14px] !w-[14px] shrink-0 text-faint" />
    </div>
  )
}

function MemberRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border-l-4 border-l-hairline bg-surface p-3 shadow-card">
      <Skeleton className="h-6 w-6 shrink-0 rounded-lg" />
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-[13px] w-[55%] rounded" />
        <Skeleton className="h-[11px] w-[40%] rounded" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
    </div>
  )
}

