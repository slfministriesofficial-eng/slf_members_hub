import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Dropdown } from '../components/ui/Dropdown'
import { Avatar } from '../components/ui/Avatar'
import { Skeleton } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { getAttendanceMarks, setAttendanceMarks, togglePresence, type AttendanceMarksMap } from '../utils/attendanceMarks'
import type { Member } from '../mock/types'

const FILTER_OPTIONS: { key: 'all' | 'checked-in' | 'not-checked-in'; label: string }[] = [
  { key: 'all', label: 'All Members' },
  { key: 'checked-in', label: 'Checked In' },
  { key: 'not-checked-in', label: 'Not Checked In' },
]

const PREVIEW_LIMIT = 5

function formatFullDate(date: Date): string {
  return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'long' })} ${date.getFullYear()}`
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '')
}

// A summary dashboard with an embedded quick-mark list (mobile) — a fuller,
// dedicated searchable tool for the same job also lives at "View All"
// (AttendanceMarkAllScreen), for whoever's doing the actual door-to-door
// checking-in rather than a quick glance/adjustment here.
export function AttendanceScreen() {
  const { members, isLoading, isError } = useMembers()
  const navigate = useNavigate()
  const [showServiceHistory, setShowServiceHistory] = useState(false)
  const [query, setQuery] = useState('')
  // Defaults to "Not Checked In" — the dashboard's quick list is for
  // whoever's still missing, not a full roster; "All Members" is one tap away.
  const [filterKey, setFilterKey] = useState<'all' | 'checked-in' | 'not-checked-in'>('not-checked-in')
  const [marks, setMarks] = useState<AttendanceMarksMap>(getAttendanceMarks)

  function toggleMark(memberId: string) {
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

      if (filterKey === 'checked-in') return Boolean(marks[m.id])
      if (filterKey === 'not-checked-in') return !marks[m.id]
      return true
    })
  }, [members, query, filterKey, marks])

  // Dashboard shows a short preview only — "View All" leads to the separate,
  // always-full-list, dedicated marking page for the rest.
  const visibleMembers = filtered.slice(0, PREVIEW_LIMIT)

  const allFilteredChecked = filtered.length > 0 && filtered.every((m) => marks[m.id])

  function toggleSelectAll() {
    const next = { ...marks }
    if (allFilteredChecked) {
      for (const m of filtered) delete next[m.id]
    } else {
      const now = Date.now()
      for (const m of filtered) next[m.id] = next[m.id] ?? { markedAt: now }
    }
    setAttendanceMarks(next)
    setMarks(next)
  }

  const stats = useMemo(() => {
    let present = 0
    for (const m of members) {
      if (marks[m.id]) present++
    }
    return { total: members.length, present, absent: members.length - present }
  }, [members, marks])

  const progressPct = stats.total ? Math.round((stats.present / stats.total) * 100) : 0

  return (
    <div className="pb-8">
      {/* ============================== DESKTOP (untouched) ============================== */}
      <div className="hidden md:block motion-safe:animate-[fade-rise_0.4s_ease-out_both]">
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => setShowServiceHistory(true)}
            className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 text-[11px] font-bold text-heading transition-colors hover:bg-paper"
          >
            <Icon name="cal-check" className="icon !h-[12px] !w-[12px] text-brass-deep" />
            Attendance History
          </button>
        </div>

        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">
              Sunday Service Attendance
            </h1>
            <p className="mt-1 text-[12.5px] text-slate">
              Mark member attendance for today's service and monitor participation.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2.5 md:w-[280px]">
            <div className="text-[12px] font-semibold text-slate">{formatFullDate(new Date())}</div>

            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-slate">
                <span>Attendance Progress</span>
                <span className="font-mono text-heading">{progressPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brass to-brass-deep transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-slate">
                <b className="font-mono font-semibold text-heading">{stats.present}</b> of {members.length} Members
                Present
              </div>
            </div>

            <button
              onClick={() => navigate('/attendance/all')}
              className="motion-safe:animate-[gradient-drift_5s_ease_infinite] flex items-center justify-center gap-1.5 rounded-full bg-[length:300%_300%] bg-gradient-to-r from-brass via-[#E4C57E] to-brass-deep px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_10px_20px_rgba(184,134,58,0.4)] transition-transform hover:scale-105"
            >
              <Icon name="users" className="icon !h-[15px] !w-[15px]" />
              View All Members
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <SummaryStatCard icon="users" label="Total Members" value={stats.total} tone="brass" />
          <SummaryStatCard icon="check" label="Present" value={stats.present} tone="regular" />
          <SummaryStatCard icon="x" label="Absent" value={stats.absent} tone="alert" />
        </div>

        {isError && (
          <p className="py-8 text-center text-[13px] text-slate">
            Could not load members — check your connection.
          </p>
        )}
      </div>

      {/* ============================== MOBILE (own layout) ============================== */}
      <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] md:hidden">
        {/* Title + the page's own action button share the top row, and the subtitle
            sits below on one line — same alignment pattern as the Members page. */}
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <h1 className="shrink-0 font-display text-[21px] font-bold text-heading">Attendance</h1>
            <span className="truncate text-[11px] font-semibold text-slate">{formatFullDate(new Date())}</span>
          </div>
          <button onClick={() => setShowServiceHistory(true)} className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep shadow-card">
              <Icon name="cal-check" className="icon !h-[16px] !w-[16px] text-white" />
            </span>
            <span className="text-[12px] font-bold text-brass-deep">History</span>
          </button>
        </div>
        <p className="mb-4 overflow-hidden whitespace-nowrap text-[10px] text-slate">
          Mark member attendance for today's service and monitor participation.
        </p>

        <div className="mb-4 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-3.5 py-2 shadow-card transition-shadow focus-within:shadow-elev">
            <Icon name="search" className="icon !h-[17px] !w-[17px] text-slate" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, ID, phone, WI…"
              className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-slate outline-none"
            />
          </div>
          <div className="shrink-0">
            <Dropdown
              value={filterKey}
              onChange={(v) => setFilterKey(v as typeof filterKey)}
              align="right"
              options={FILTER_OPTIONS.map((f) => ({ value: f.key, label: f.label }))}
              triggerClassName="h-full rounded-2xl bg-surface py-2 pl-2.5 pr-2 text-[11px] font-semibold text-heading shadow-card"
            />
          </div>
        </div>

        <div className="mb-4 rounded-2xl bg-surface p-4 shadow-card">
          <div className="mb-1.5 flex items-center justify-between text-[12px] font-bold text-slate">
            <span>Attendance Progress</span>
            <span className="font-mono text-[13px] text-heading">{progressPct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-paper-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brass to-brass-deep transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1.5 text-[12px] text-slate">
            <b className="font-mono font-semibold text-heading">{stats.present}</b> / {members.length} Members Checked
            In
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <SummaryStatCard icon="users" label="Total Members" value={stats.total} tone="brass" />
          <SummaryStatCard icon="check" label="Checked In" value={stats.present} tone="regular" />
          <SummaryStatCard icon="x" label="Not Checked In" value={stats.absent} tone="alert" />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-bold text-heading">Members ({members.length})</h2>
          <button
            onClick={() => navigate('/attendance/all')}
            className="rounded-full border border-brass-deep px-3.5 py-1.5 text-[11.5px] font-bold text-brass-deep transition-colors hover:bg-brass/10"
          >
            View All
          </button>
        </div>

        {isError && (
          <p className="py-8 text-center text-[13px] text-slate">
            Could not load members — check your connection.
          </p>
        )}

        {!isError && isLoading && (
          <div className="space-y-2.5">
            <DashboardRowSkeleton />
            <DashboardRowSkeleton />
            <DashboardRowSkeleton />
          </div>
        )}

        {!isError && !isLoading && filtered.length === 0 && (
          <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-10 text-center shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-paper-2">
              <Icon name="search" className="icon !h-[22px] !w-[22px] text-faint" />
            </span>
            <h3 className="font-display text-[15px] font-bold text-heading">No members found.</h3>
            <p className="max-w-[240px] text-[12px] text-slate">Try another search or filter.</p>
          </div>
        )}

        {!isError && !isLoading && filtered.length > 0 && (
          <>
            <button
              onClick={toggleSelectAll}
              className="mb-1.5 flex items-center gap-2 rounded-xl px-1 py-1 text-[12.5px] font-semibold text-heading"
            >
              <DashboardCheckbox checked={allFilteredChecked} onChange={toggleSelectAll} ariaLabel="Select all" />
              Select All
            </button>

            <div className="space-y-2">
              {visibleMembers.map((member) => (
                <DashboardMemberRow
                  key={member.id}
                  member={member}
                  checked={Boolean(marks[member.id])}
                  onToggle={() => toggleMark(member.id)}
                  onOpenProfile={() => navigate(`/celebration-profile/attendance/${member.id}`)}
                />
              ))}
            </div>

            {filtered.length > visibleMembers.length && (
              <button
                onClick={() => navigate('/attendance/all')}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-surface py-3 text-[12.5px] font-bold text-heading shadow-card transition-colors hover:bg-paper"
              >
                View All ({filtered.length} Members)
                <Icon name="chevron" className="icon !h-[12px] !w-[12px]" />
              </button>
            )}
          </>
        )}
      </div>

      {showServiceHistory && <ServiceHistoryModal onClose={() => setShowServiceHistory(false)} />}
    </div>
  )
}

const TONE_STYLES: Record<string, string> = {
  brass: 'bg-gradient-to-br from-brass to-brass-deep text-white',
  regular: 'bg-status-regular-bg text-status-regular-fg',
  alert: 'bg-status-alert-bg text-status-alert-fg',
  slate: 'bg-paper-2 text-slate',
}

function SummaryStatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: string
  label: string
  value: number
  tone: keyof typeof TONE_STYLES
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface p-2.5 text-center shadow-card transition-shadow hover:shadow-elev md:flex-row md:items-center md:gap-3 md:p-3.5 md:text-left">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full md:h-10 md:w-10 ${TONE_STYLES[tone]}`}
      >
        <Icon name={icon} className="icon !h-[14px] !w-[14px] md:!h-[17px] md:!w-[17px]" />
      </span>
      <div className="min-w-0">
        <div className="font-display text-[16px] font-bold leading-none text-heading md:text-[19px]">{value}</div>
        <div className="mt-1 line-clamp-2 text-[8.5px] font-semibold uppercase leading-tight tracking-wide text-slate md:truncate md:text-[10px]">
          {label}
        </div>
      </div>
    </div>
  )
}

function DashboardCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: () => void
  ariaLabel: string
}) {
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
      className="flex h-6 w-6 shrink-0 items-center justify-center"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
          checked ? 'border-status-regular-fg bg-status-regular-fg' : 'border-hairline bg-surface'
        }`}
      >
        {checked && <Icon name="check" className="icon !h-[12px] !w-[12px] text-white" />}
      </span>
    </button>
  )
}

// Dashboard's own compact row — plain (no status pill/left-border accent),
// since the checkbox alone already says everything: checked = checked in.
function DashboardMemberRow({
  member,
  checked,
  onToggle,
  onOpenProfile,
}: {
  member: Member
  checked: boolean
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
      className="flex cursor-pointer items-center gap-2.5 rounded-2xl bg-surface p-3 shadow-card transition-shadow active:shadow-elev"
    >
      <DashboardCheckbox checked={checked} onChange={onToggle} ariaLabel={`Mark ${member.name} checked in`} />
      <Avatar initials={member.initials} color={member.color} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-heading">{member.name}</div>
        <div className="mt-0.5 truncate font-mono text-[10.5px] text-slate">
          {member.memberId} • {member.ministry}
        </div>
        <div className="mt-0.5 text-[10px] text-slate">Member Since {sinceYear}</div>
      </div>
      <Icon name="chevron" className="icon !h-[14px] !w-[14px] shrink-0 text-faint" />
    </div>
  )
}

function DashboardRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-surface p-3 shadow-card">
      <Skeleton className="h-5 w-5 shrink-0 rounded-md" />
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-[13px] w-[55%] rounded" />
        <Skeleton className="h-[11px] w-[40%] rounded" />
      </div>
    </div>
  )
}

// Honest placeholder — same reasoning as MemberHistoryModal, at the whole-service level.
function ServiceHistoryModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="motion-safe:animate-[scale-in_0.25s_ease-out_both] w-full max-w-[420px] rounded-[26px] bg-surface p-5 shadow-elev"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-display text-[16px] font-bold text-heading">Attendance History</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate hover:bg-paper"
          >
            <Icon name="x" className="icon !h-[14px] !w-[14px]" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-paper px-4 py-10 text-center">
          <Icon name="cal-check" className="icon !h-[24px] !w-[24px] text-faint" />
          <p className="text-[12.5px] font-semibold text-heading">No past records yet</p>
          <p className="max-w-[260px] text-[11.5px] text-slate">
            Past service dates will appear here — with present/absent counts and attendance % — once attendance is
            saved across multiple Sundays.
          </p>
        </div>
      </div>
    </div>
  )
}
