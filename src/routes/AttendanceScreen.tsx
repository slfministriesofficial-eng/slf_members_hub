import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Avatar } from '../components/ui/Avatar'
import { Skeleton } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { MINISTRY_OPTIONS } from '../features/members/types'
import type { Member } from '../mock/types'

type MarkStatus = 'present' | 'absent'
type Mark = { status: MarkStatus; markedAt: number }
type MarksMap = Record<string, Mark>
type BulkAction = 'present' | 'absent' | 'reset'

const FILTER_CHIPS: { key: string; label: string }[] = [
  { key: 'all', label: 'All Members' },
  { key: 'present', label: 'Present' },
  { key: 'absent', label: 'Absent' },
  { key: 'not-marked', label: 'Not Marked' },
]

// Mobile brings ministry filtering back as a second chip row (desktop keeps
// just the 4 status chips, unchanged) — same underlying filterKey state, so
// there's one filtering source of truth regardless of which chips set it.
const MINISTRY_CHIPS: { key: string; label: string }[] = MINISTRY_OPTIONS.map((m) => ({ key: m, label: m }))

// Strips punctuation/case so "SLF-0001", "slf0001", and "0001" all match the same member.
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function formatFullDate(date: Date): string {
  return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'long' })} ${date.getFullYear()}`
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function AttendanceScreen() {
  const { members, isLoading, isError } = useMembers()
  const navigate = useNavigate()

  // savedMarks is today's last-saved checkpoint (session-local — there is no
  // attendance backend yet); draftMarks is the working copy the toggles edit.
  // The difference is what "N Changes Pending" counts.
  const [savedMarks, setSavedMarks] = useState<MarksMap>({})
  const [draftMarks, setDraftMarks] = useState<MarksMap>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [filterKey, setFilterKey] = useState('all')
  const [pendingBulkAction, setPendingBulkAction] = useState<BulkAction | null>(null)
  const [toast, setToast] = useState<{ icon: string; message: string } | null>(null)
  const [historyMember, setHistoryMember] = useState<Member | null>(null)
  const [quickHistoryMember, setQuickHistoryMember] = useState<Member | null>(null)
  const [showServiceHistory, setShowServiceHistory] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  function setMark(id: string, status: MarkStatus | 'not-marked') {
    setDraftMarks((prev) => {
      const next = { ...prev }
      if (status === 'not-marked') {
        delete next[id]
      } else {
        next[id] = { status, markedAt: Date.now() }
      }
      return next
    })
  }

  // Tapping the already-active state clears it back to Not Marked instead of
  // needing a separate third button for that.
  function toggleMark(id: string, status: MarkStatus) {
    setMark(id, draftMarks[id]?.status === status ? 'not-marked' : status)
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function markSelected(status: MarkStatus) {
    const now = Date.now()
    setDraftMarks((prev) => {
      const next = { ...prev }
      for (const id of selectedIds) next[id] = { status, markedAt: now }
      return next
    })
    clearSelection()
  }

  function saveAttendance() {
    setSavedMarks(draftMarks)
    setToast({ icon: 'check', message: `Attendance saved — ${Object.keys(draftMarks).length} member(s) marked.` })
  }

  function cancelChanges() {
    setDraftMarks(savedMarks)
  }

  function confirmBulkAction() {
    if (pendingBulkAction === 'present' || pendingBulkAction === 'absent') {
      const status = pendingBulkAction
      const now = Date.now()
      setDraftMarks((prev) => {
        const next = { ...prev }
        for (const m of members) {
          if (!(m.id in next)) next[m.id] = { status, markedAt: now }
        }
        return next
      })
    } else if (pendingBulkAction === 'reset') {
      setDraftMarks({})
      setSavedMarks({})
      clearSelection()
    }
    setPendingBulkAction(null)
  }

  const bulkActionCopy: Record<BulkAction, { title: string; message: string; confirmLabel: string; danger?: boolean }> =
    {
      present: {
        title: 'Mark All Remaining Present?',
        message: 'Every member not yet marked today will be set to Present.',
        confirmLabel: 'Mark Present',
      },
      absent: {
        title: 'Mark All Remaining Absent?',
        message: 'Every member not yet marked today will be set to Absent.',
        confirmLabel: 'Mark Absent',
      },
      reset: {
        title: "Reset Today's Attendance?",
        message: 'This clears every mark for today, including anything already saved. This cannot be undone.',
        confirmLabel: 'Reset Attendance',
        danger: true,
      },
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

      if (filterKey === 'all') return true
      if (filterKey === 'present') return draftMarks[m.id]?.status === 'present'
      if (filterKey === 'absent') return draftMarks[m.id]?.status === 'absent'
      if (filterKey === 'not-marked') return draftMarks[m.id] === undefined
      // Any other key is a ministry chip (mobile-only row) — desktop never sets these.
      return m.ministryInterests?.includes(filterKey) ?? false
    })
  }, [members, query, filterKey, draftMarks])

  const stats = useMemo(() => {
    let present = 0
    let absent = 0
    for (const m of members) {
      if (draftMarks[m.id]?.status === 'present') present++
      else if (draftMarks[m.id]?.status === 'absent') absent++
    }
    return { total: members.length, present, absent, notMarked: members.length - present - absent }
  }, [members, draftMarks])

  const markedCount = stats.present + stats.absent
  const progressPct = members.length ? Math.round((markedCount / members.length) * 100) : 0

  const pendingChangesCount = useMemo(() => {
    const ids = new Set([...Object.keys(draftMarks), ...Object.keys(savedMarks)])
    let count = 0
    for (const id of ids) {
      if (draftMarks[id]?.status !== savedMarks[id]?.status) count++
    }
    return count
  }, [draftMarks, savedMarks])

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
                <b className="font-mono font-semibold text-heading">{markedCount}</b> of {members.length} Members
                Marked
              </div>
            </div>

            {pendingChangesCount > 0 ? (
              <button
                onClick={saveAttendance}
                className="motion-safe:animate-[gradient-drift_5s_ease_infinite] flex items-center justify-center gap-1.5 rounded-full bg-[length:300%_300%] bg-gradient-to-r from-brass via-[#E4C57E] to-brass-deep px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_10px_20px_rgba(184,134,58,0.4)] transition-transform hover:scale-105"
              >
                <Icon name="check" className="icon !h-[15px] !w-[15px]" />
                Save Attendance
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1.5 rounded-full bg-status-regular-bg px-4 py-2.5 text-[12.5px] font-bold text-status-regular-fg">
                <Icon name="check" className="icon !h-[14px] !w-[14px]" />
                All Changes Saved
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
          <SummaryStatCard icon="users" label="Total Members" value={stats.total} tone="brass" />
          <SummaryStatCard icon="check" label="Present" value={stats.present} tone="regular" />
          <SummaryStatCard icon="x" label="Absent" value={stats.absent} tone="alert" />
          <SummaryStatCard icon="minus" label="Not Marked" value={stats.notMarked} tone="slate" />
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-card transition-shadow focus-within:shadow-elev">
          <Icon name="search" className="icon !h-[17px] !w-[17px] text-slate" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, member ID, phone, WhatsApp, or ministry…"
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

        {/* Secondary bulk actions — the selection bar below is the primary way to mark many at once. */}
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setPendingBulkAction('present')}
            className="flex items-center gap-1.5 rounded-full border border-hairline bg-transparent px-3 py-2 text-[11.5px] font-semibold text-slate transition-colors hover:bg-paper hover:text-heading"
          >
            <Icon name="check" className="icon !h-[12px] !w-[12px]" />
            <span className="sm:hidden">Mark Present</span>
            <span className="hidden sm:inline">Mark All Remaining Present</span>
          </button>
          <button
            onClick={() => setPendingBulkAction('absent')}
            className="flex items-center gap-1.5 rounded-full border border-hairline bg-transparent px-3 py-2 text-[11.5px] font-semibold text-slate transition-colors hover:bg-paper hover:text-heading"
          >
            <Icon name="x" className="icon !h-[12px] !w-[12px]" />
            <span className="sm:hidden">Mark Absent</span>
            <span className="hidden sm:inline">Mark All Remaining Absent</span>
          </button>
          <button
            onClick={() => setPendingBulkAction('reset')}
            className="flex items-center gap-1.5 rounded-full border border-hairline bg-transparent px-3 py-2 text-[11.5px] font-semibold text-slate transition-colors hover:bg-status-alert-bg hover:text-status-alert-fg"
          >
            <Icon name="refresh" className="icon !h-[12px] !w-[12px]" />
            Reset Attendance
          </button>
        </div>

        {isError && (
          <p className="py-8 text-center text-[13px] text-slate">
            Could not load members — check your connection.
          </p>
        )}

        {!isError && isLoading && (
          <div className="space-y-2.5">
            <AttendanceRowSkeleton />
            <AttendanceRowSkeleton />
            <AttendanceRowSkeleton />
            <AttendanceRowSkeleton />
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
          <div className="space-y-2.5">
            {filtered.map((member, i) => (
              <AttendanceMemberRow
                key={member.id}
                member={member}
                mark={draftMarks[member.id]}
                selected={selectedIds.has(member.id)}
                onToggleSelect={() => toggleSelect(member.id)}
                onToggleMark={(status) => toggleMark(member.id, status)}
                onViewProfile={() => navigate(`/members/${member.id}`)}
                onShowHistory={() => setHistoryMember(member)}
                delayMs={Math.min(i, 8) * 40}
              />
            ))}
          </div>
        )}

        {/* Stacked sticky bars — selection (contextual) above pending-changes (persistent) so they never overlap. */}
        <div className="fixed inset-x-3 bottom-24 z-40 hidden flex-col gap-2 md:flex md:inset-x-auto md:bottom-8 md:left-1/2 md:w-[480px] md:-translate-x-1/2">
          {selectedIds.size > 0 && (
            <div className="motion-safe:animate-[fade-rise_0.3s_ease-out] flex flex-col gap-2 rounded-2xl bg-ink-deep px-4 py-3 shadow-elev sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-white">
                <Icon name="check" className="icon !h-[14px] !w-[14px]" />
                {selectedIds.size} Member{selectedIds.size === 1 ? '' : 's'} Selected
              </span>
              <div className="grid grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:shrink-0">
                <button
                  onClick={() => markSelected('present')}
                  className="rounded-full bg-status-regular-fg px-2 py-2 text-[11.5px] font-bold text-white transition-opacity hover:opacity-90 sm:px-3.5"
                >
                  Mark Present
                </button>
                <button
                  onClick={() => markSelected('absent')}
                  className="rounded-full bg-status-alert-fg px-2 py-2 text-[11.5px] font-bold text-white transition-opacity hover:opacity-90 sm:px-3.5"
                >
                  Mark Absent
                </button>
                <button
                  onClick={clearSelection}
                  className="rounded-full bg-white/10 px-2 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-white/15 sm:px-3.5"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {pendingChangesCount > 0 && (
            <div className="motion-safe:animate-[fade-rise_0.3s_ease-out] flex flex-col gap-2 rounded-2xl bg-ink-deep px-4 py-3 shadow-elev sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[12.5px] font-bold text-white">
                {pendingChangesCount} Change{pendingChangesCount === 1 ? '' : 's'} Pending
              </span>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0">
                <button
                  onClick={cancelChanges}
                  className="rounded-full bg-white/10 px-3.5 py-2 text-[11.5px] font-bold text-white transition-colors hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAttendance}
                  className="rounded-full bg-brass px-4 py-2 text-[11.5px] font-bold text-ink-deep transition-colors hover:bg-brass-deep hover:text-white"
                >
                  Save Attendance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================== MOBILE (own layout) ============================== */}
      <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] md:hidden">
        <div className="mb-4 flex flex-col gap-2.5">
          <h1 className="font-display text-[21px] font-bold text-heading">Sunday Service Attendance</h1>
          <p className="text-[12.5px] text-slate">
            Mark member attendance for today's service and monitor participation.
          </p>
          <div className="text-[12.5px] font-semibold text-slate">{formatFullDate(new Date())}</div>
          <button
            onClick={() => setShowServiceHistory(true)}
            className="flex w-fit items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-2 text-[12px] font-bold text-heading transition-colors hover:bg-paper"
          >
            <Icon name="cal-check" className="icon !h-[13px] !w-[13px] text-brass-deep" />
            Attendance History
          </button>
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
            <b className="font-mono font-semibold text-heading">{markedCount}</b> / {members.length} Members Marked
          </div>

          <div className="mt-3">
            {pendingChangesCount > 0 ? (
              <button
                onClick={saveAttendance}
                className="motion-safe:animate-[gradient-drift_5s_ease_infinite] flex w-full items-center justify-center gap-1.5 rounded-full bg-[length:300%_300%] bg-gradient-to-r from-brass via-[#E4C57E] to-brass-deep px-4 py-3 text-[13px] font-bold text-white shadow-[0_10px_20px_rgba(184,134,58,0.4)] transition-transform active:scale-[0.98]"
              >
                <Icon name="check" className="icon !h-[15px] !w-[15px]" />
                {pendingChangesCount} Change{pendingChangesCount === 1 ? '' : 's'} Pending · Save Attendance
              </button>
            ) : (
              <div className="flex w-full items-center justify-center gap-1.5 rounded-full bg-status-regular-bg px-4 py-3 text-[13px] font-bold text-status-regular-fg">
                <Icon name="check" className="icon !h-[14px] !w-[14px]" />
                All Changes Saved
              </div>
            )}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <SummaryStatCard icon="users" label="Total Members" value={stats.total} tone="brass" />
          <SummaryStatCard icon="check" label="Present" value={stats.present} tone="regular" />
          <SummaryStatCard icon="x" label="Absent" value={stats.absent} tone="alert" />
          <SummaryStatCard icon="minus" label="Not Marked" value={stats.notMarked} tone="slate" />
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-card transition-shadow focus-within:shadow-elev">
          <Icon name="search" className="icon !h-[17px] !w-[17px] text-slate" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ID, phone, WhatsApp, or ministry…"
            className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-slate outline-none"
          />
        </div>

        {/* Sticky filter chips — pinned to the top of the viewport while scrolling past the list. */}
        <div className="sticky top-0 z-30 -mx-4 bg-paper px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTER_CHIPS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterKey(f.key)}
                className={`motion-safe:animate-[fade-rise_0.25s_ease-out_both] shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
                  filterKey === f.key ? 'bg-ink-deep text-white' : 'bg-surface text-heading shadow-card'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {MINISTRY_CHIPS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterKey(f.key)}
                className={`motion-safe:animate-[fade-rise_0.25s_ease-out_both] shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
                  filterKey === f.key ? 'bg-ink-deep text-white' : 'bg-surface text-heading shadow-card'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compact bulk-action chips — "Selected" chips act on the checkboxes (no
            confirm, same as the sticky bar below); Reset stays confirm-gated since
            it's the one action here that touches everyone, not just a checked few. */}
        <div className="my-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => markSelected('present')}
            disabled={selectedIds.size === 0}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-status-regular-bg px-3.5 py-2 text-[12px] font-bold text-status-regular-fg disabled:opacity-40"
          >
            <Icon name="check" className="icon !h-[13px] !w-[13px]" />
            Mark Selected Present
          </button>
          <button
            onClick={() => markSelected('absent')}
            disabled={selectedIds.size === 0}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-status-alert-bg px-3.5 py-2 text-[12px] font-bold text-status-alert-fg disabled:opacity-40"
          >
            <Icon name="x" className="icon !h-[13px] !w-[13px]" />
            Mark Selected Absent
          </button>
          <button
            onClick={() => setPendingBulkAction('reset')}
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-paper-2 px-3.5 py-2 text-[12px] font-bold text-slate"
          >
            <Icon name="refresh" className="icon !h-[13px] !w-[13px]" />
            Reset Attendance
          </button>
        </div>

        {isError && (
          <p className="py-8 text-center text-[13px] text-slate">
            Could not load members — check your connection.
          </p>
        )}

        {!isError && isLoading && (
          <div className="space-y-2.5">
            <MobileMemberCardSkeleton />
            <MobileMemberCardSkeleton />
            <MobileMemberCardSkeleton />
            <MobileMemberCardSkeleton />
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
          <div className="space-y-2.5 pb-28">
            {filtered.map((member, i) => (
              <MobileMemberCard
                key={member.id}
                member={member}
                mark={draftMarks[member.id]}
                selected={selectedIds.has(member.id)}
                onToggleSelect={() => toggleSelect(member.id)}
                onToggleMark={(status) => toggleMark(member.id, status)}
                onOpenHistory={() => setQuickHistoryMember(member)}
                delayMs={Math.min(i, 8) * 40}
              />
            ))}
          </div>
        )}

        {/* Single transitioning sticky bar: Selected → Pending, never both at once. */}
        {(selectedIds.size > 0 || pendingChangesCount > 0) && (
          <div className="fixed inset-x-3 bottom-24 z-40 motion-safe:animate-[fade-rise_0.3s_ease-out] rounded-2xl bg-ink-deep px-4 py-3 shadow-elev">
            {selectedIds.size > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-white">
                  <Icon name="check" className="icon !h-[14px] !w-[14px]" />
                  {selectedIds.size} Member{selectedIds.size === 1 ? '' : 's'} Selected
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => markSelected('present')}
                    className="rounded-full bg-status-regular-fg px-3 py-2.5 text-[12.5px] font-bold text-white"
                  >
                    Mark Present
                  </button>
                  <button
                    onClick={() => markSelected('absent')}
                    className="rounded-full bg-status-alert-fg px-3 py-2.5 text-[12.5px] font-bold text-white"
                  >
                    Mark Absent
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-[12.5px] font-bold text-white">
                  {pendingChangesCount} Change{pendingChangesCount === 1 ? '' : 's'} Pending
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={cancelChanges}
                    className="rounded-full bg-white/10 px-3 py-2.5 text-[12.5px] font-bold text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveAttendance}
                    className="rounded-full bg-brass px-3 py-2.5 text-[12.5px] font-bold text-ink-deep"
                  >
                    Save Attendance
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-56 z-40 flex justify-center px-4 md:bottom-40 motion-safe:animate-[fade-rise_0.3s_ease-out]">
          <div className="flex max-w-[92vw] items-center gap-2 rounded-full bg-ink-deep px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-elev">
            <Icon name={toast.icon} className="icon !h-[14px] !w-[14px] shrink-0 text-white" />
            <span className="truncate">{toast.message}</span>
          </div>
        </div>
      )}

      {pendingBulkAction && (
        <ConfirmModal
          {...bulkActionCopy[pendingBulkAction]}
          onCancel={() => setPendingBulkAction(null)}
          onConfirm={confirmBulkAction}
        />
      )}

      {historyMember && (
        <MemberHistoryModal member={historyMember} onClose={() => setHistoryMember(null)} />
      )}

      {quickHistoryMember && (
        <MemberQuickHistorySheet
          member={quickHistoryMember}
          onClose={() => setQuickHistoryMember(null)}
          onViewFull={() => {
            const m = quickHistoryMember
            setQuickHistoryMember(null)
            setHistoryMember(m)
          }}
        />
      )}

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
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card transition-shadow hover:shadow-elev">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_STYLES[tone]}`}>
        <Icon name={icon} className="icon !h-[17px] !w-[17px]" />
      </span>
      <div className="min-w-0">
        <div className="font-display text-[19px] font-bold leading-none text-heading">{value}</div>
        <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-slate">{label}</div>
      </div>
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
      className="flex h-9 w-9 shrink-0 items-center justify-center"
    >
      <span
        className={`flex h-[22px] w-[22px] items-center justify-center rounded-lg border-2 transition-colors ${
          checked ? 'border-ink-deep bg-ink-deep' : 'border-hairline bg-surface'
        }`}
      >
        {checked && <Icon name="check" className="icon !h-[13px] !w-[13px] text-white" />}
      </span>
    </button>
  )
}

// Two-state toggle — tapping the already-active button clears it back to Not
// Marked, so a third dedicated button isn't needed for that state.
function AttendanceToggle({
  status,
  onToggle,
}: {
  status: MarkStatus | undefined
  onToggle: (status: MarkStatus) => void
}) {
  return (
    <div role="group" aria-label="Attendance status" className="grid w-full grid-cols-2 gap-1.5 md:w-auto md:flex">
      <button
        type="button"
        onClick={() => onToggle('present')}
        aria-pressed={status === 'present'}
        className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-[11.5px] font-bold transition-colors md:min-h-[38px] md:px-4 ${
          status === 'present' ? 'bg-status-regular-bg text-status-regular-fg' : 'bg-paper text-slate hover:bg-paper-2'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${status === 'present' ? 'bg-status-regular-fg' : 'bg-faint'}`} />
        Present
      </button>
      <button
        type="button"
        onClick={() => onToggle('absent')}
        aria-pressed={status === 'absent'}
        className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-3 text-[11.5px] font-bold transition-colors md:min-h-[38px] md:px-4 ${
          status === 'absent' ? 'bg-status-alert-bg text-status-alert-fg' : 'bg-paper text-slate hover:bg-paper-2'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${status === 'absent' ? 'bg-status-alert-fg' : 'bg-faint'}`} />
        Absent
      </button>
    </div>
  )
}

const ROW_BORDER: Record<'present' | 'absent' | 'unmarked', string> = {
  present: 'border-l-status-regular-fg',
  absent: 'border-l-status-alert-fg',
  unmarked: 'border-l-hairline',
}

function AttendanceMemberRow({
  member,
  mark,
  selected,
  onToggleSelect,
  onToggleMark,
  onViewProfile,
  onShowHistory,
  delayMs,
}: {
  member: Member
  mark: Mark | undefined
  selected: boolean
  onToggleSelect: () => void
  onToggleMark: (status: MarkStatus) => void
  onViewProfile: () => void
  onShowHistory: () => void
  delayMs: number
}) {
  const sinceYear = member.joinDate.slice(-4)
  const borderTone = mark?.status ?? 'unmarked'

  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      className={`motion-safe:animate-[fade-rise_0.35s_ease-out_both] flex flex-col gap-3 rounded-2xl border-l-4 bg-surface p-3.5 shadow-card transition-shadow hover:shadow-elev md:flex-row md:items-center md:gap-3 md:p-4 ${ROW_BORDER[borderTone]}`}
    >
      <div className="flex items-center gap-1">
        <Checkbox checked={selected} onChange={onToggleSelect} ariaLabel={`Select ${member.name}`} />

        <button onClick={onViewProfile} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Avatar initials={member.initials} color={member.color} size={44} />
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-bold text-heading">{member.name}</div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-slate">
              {member.memberId} • {member.ministry}
            </div>
            <div className="mt-0.5 text-[10.5px] text-slate">Member Since {sinceYear}</div>
          </div>
        </button>
      </div>

      <div className="flex flex-col gap-1.5 md:items-end">
        <div className="flex w-full items-center gap-1.5 md:w-auto">
          <div className="min-w-0 flex-1 md:flex-none">
            <AttendanceToggle status={mark?.status} onToggle={onToggleMark} />
          </div>
          <button
            onClick={onShowHistory}
            aria-label="Attendance history"
            title="Attendance History"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2 text-slate transition-colors hover:bg-paper hover:text-heading md:px-3"
          >
            <Icon name="cal-check" className="icon !h-[15px] !w-[15px]" />
            <span className="hidden text-[11px] font-bold md:inline">History</span>
          </button>
        </div>
        {mark && (
          <div
            className={`flex items-center gap-1 text-[10.5px] font-semibold ${
              mark.status === 'present' ? 'text-status-regular-fg' : 'text-status-alert-fg'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                mark.status === 'present' ? 'bg-status-regular-fg' : 'bg-status-alert-fg'
              }`}
            />
            {mark.status === 'present' ? 'Present' : 'Absent'} · Marked at {formatTime(mark.markedAt)}
          </div>
        )}
      </div>
    </div>
  )
}

function AttendanceRowSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-l-4 border-l-hairline bg-surface p-3.5 shadow-card md:flex-row md:items-center md:gap-4 md:p-4">
      <div className="flex flex-1 items-center gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-[13px] w-[55%] rounded" />
          <Skeleton className="h-[11px] w-[40%] rounded" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-2xl md:w-[220px]" />
    </div>
  )
}

// Mobile-only compact card. Once marked, the Present/Absent buttons are
// replaced by a single tappable status pill (tapping it clears the mark and
// brings the buttons back) instead of showing both buttons permanently.
function MobileMemberCard({
  member,
  mark,
  selected,
  onToggleSelect,
  onToggleMark,
  onOpenHistory,
  delayMs,
}: {
  member: Member
  mark: Mark | undefined
  selected: boolean
  onToggleSelect: () => void
  onToggleMark: (status: MarkStatus) => void
  onOpenHistory: () => void
  delayMs: number
}) {
  const sinceYear = member.joinDate.slice(-4)
  const borderTone = mark?.status ?? 'unmarked'

  return (
    <div
      style={{ animationDelay: `${delayMs}ms` }}
      onClick={onOpenHistory}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpenHistory()
      }}
      className={`motion-safe:animate-[fade-rise_0.3s_ease-out_both] flex cursor-pointer flex-col gap-3 rounded-2xl border-l-4 bg-surface p-3.5 shadow-card transition-shadow active:shadow-elev ${ROW_BORDER[borderTone]}`}
    >
      <div className="flex items-center gap-2">
        <Checkbox checked={selected} onChange={onToggleSelect} ariaLabel={`Select ${member.name}`} />
        <Avatar initials={member.initials} color={member.color} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-bold text-heading">{member.name}</div>
          <div className="mt-0.5 truncate font-mono text-[11px] text-slate">
            {member.memberId} • {member.ministry}
          </div>
          <div className="mt-0.5 text-[10.5px] text-slate">Member Since {sinceYear}</div>
        </div>
        <Icon name="chevron" className="icon !h-[14px] !w-[14px] shrink-0 text-faint" />
      </div>

      {mark ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleMark(mark.status)
          }}
          className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-[12.5px] font-bold transition-colors ${
            mark.status === 'present'
              ? 'bg-status-regular-bg text-status-regular-fg'
              : 'bg-status-alert-bg text-status-alert-fg'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              mark.status === 'present' ? 'bg-status-regular-fg' : 'bg-status-alert-fg'
            }`}
          />
          {mark.status === 'present' ? 'Present' : 'Absent'} • {formatTime(mark.markedAt)}
        </button>
      ) : (
        <div onClick={(e) => e.stopPropagation()}>
          <AttendanceToggle status={undefined} onToggle={onToggleMark} />
        </div>
      )}
    </div>
  )
}

function MobileMemberCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-l-4 border-l-hairline bg-surface p-3.5 shadow-card">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-[13px] w-[55%] rounded" />
          <Skeleton className="h-[11px] w-[40%] rounded" />
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  )
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        className="motion-safe:animate-[scale-in_0.25s_ease-out_both] w-full max-w-[380px] rounded-[26px] bg-surface p-5 shadow-elev"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-[16px] font-bold text-heading">{title}</h3>
        <p className="mt-1.5 text-[13px] text-charcoal">{message}</p>
        <div className="mt-4 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-hairline bg-surface py-3 text-[13px] font-bold text-heading transition-colors hover:bg-paper"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-3 text-[13px] font-bold text-white transition-colors ${
              danger ? 'bg-[#B1503F] hover:bg-[#96412F]' : 'bg-ink hover:bg-ink-deep'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function PlaceholderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper px-2 py-3 text-center">
      <div className="font-display text-[18px] font-bold text-faint">{value}</div>
      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate">{label}</div>
    </div>
  )
}

// Honest placeholder — there is no historical attendance log to draw from
// yet (today's marks live only in this page's local state), so this shows
// the eventual layout without inventing numbers.
function MemberHistoryModal({ member, onClose }: { member: Member; onClose: () => void }) {
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
        <div className="mb-4 flex items-center gap-3">
          <Avatar initials={member.initials} color={member.color} size={44} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[16px] font-bold text-heading">{member.name}</h3>
            <p className="text-[12px] text-slate">Attendance History</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate hover:bg-paper"
          >
            <Icon name="x" className="icon !h-[14px] !w-[14px]" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <PlaceholderStat label="Attendance %" value="—" />
          <PlaceholderStat label="Current Streak" value="—" />
        </div>

        <div className="mt-3">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-slate">Last 10 Sundays</p>
          <div className="flex gap-1.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className="h-3 w-3 rounded-full bg-paper-2" />
            ))}
          </div>
        </div>

        <p className="mt-3 text-[11.5px] text-slate">
          This will populate automatically once Sunday-by-Sunday attendance tracking is connected to member records.
        </p>
      </div>
    </div>
  )
}

// Mobile-only quick-glance bottom sheet — opened by tapping a member card.
// Lighter than MemberHistoryModal (5 dots instead of 10, no section header
// chrome); "View Full Attendance History" hands off to that fuller modal.
// Same honest-placeholder reasoning: no real history data exists yet.
function MemberQuickHistorySheet({
  member,
  onClose,
  onViewFull,
}: {
  member: Member
  onClose: () => void
  onViewFull: () => void
}) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] md:hidden" onClick={onClose}>
      <div className="motion-safe:animate-[fade-rise_0.2s_ease-out] absolute inset-0 bg-black/50" />
      <div
        className="motion-safe:animate-[fade-rise_0.25s_ease-out] absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface p-5 pb-7 shadow-elev"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-hairline" />

        <div className="mb-4 flex items-center gap-3">
          <Avatar initials={member.initials} color={member.color} size={46} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[16.5px] font-bold text-heading">{member.name}</h3>
            <p className="text-[12px] text-slate">{member.memberId}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <PlaceholderStat label="Attendance %" value="—" />
          <PlaceholderStat label="Current Streak" value="—" />
        </div>

        <div className="mt-3">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-slate">Last 5 Sundays</p>
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="h-3.5 w-3.5 rounded-full bg-paper-2" />
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-paper px-3.5 py-3">
          <span className="text-[11.5px] font-semibold text-slate">Last Attended</span>
          <span className="font-mono text-[12px] font-semibold text-faint">—</span>
        </div>

        <button
          onClick={onViewFull}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface py-3 text-[13px] font-bold text-heading transition-colors hover:bg-paper"
        >
          <Icon name="cal-check" className="icon !h-[14px] !w-[14px] text-brass-deep" />
          View Full Attendance History
        </button>
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
