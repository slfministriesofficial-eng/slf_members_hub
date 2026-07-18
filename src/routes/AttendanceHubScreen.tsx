import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '../components/ui/Icon'
import { MobileBackButton } from '../components/ui/MobileBackButton'
import { useMembers } from '../features/members/MembersContext'
import { getAttendanceMarks } from '../utils/attendanceMarks'
import { fetchAttendanceTakers, fetchAttendanceSummary } from '../attendance/api'

function formatFullDate(date: Date): string {
  return `${date.getDate()} ${date.toLocaleDateString('en-US', { month: 'long' })} ${date.getFullYear()}`
}

/**
 * Attendance hub — three clear cards (same treatment as the Announcements
 * hub): mark attendance, give a volunteer access, and review the data. A slim
 * "today" summary sits on top so the page is still glanceable at a glance.
 */
export function AttendanceHubScreen() {
  const navigate = useNavigate()
  const { members, isLoading } = useMembers()
  // sessionStorage cache of today's marks — good enough for the hub's "present
  // today" glance without a round-trip (the marking screens keep it current).
  const [marks] = useState(getAttendanceMarks)
  const now = useMemo(() => new Date(), [])

  const takersQuery = useQuery({ queryKey: ['attendance-takers'], queryFn: fetchAttendanceTakers })
  const summaryQuery = useQuery({ queryKey: ['attendance-summary'], queryFn: fetchAttendanceSummary })

  const total = isLoading ? 0 : members.length
  const presentToday = members.reduce((n, m) => (marks[m.id] ? n + 1 : n), 0)
  const activeTakers = takersQuery.data?.filter((t) => t.active).length ?? null
  const recordedDates = summaryQuery.data?.length ?? null

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <MobileBackButton />
          <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">Attendance</h1>
        </div>
        <span className="shrink-0 text-[11.5px] font-semibold text-slate">{formatFullDate(now)}</span>
      </div>
      <p className="mb-5 text-[12.5px] text-slate">
        Mark today's service, give a volunteer access, and review the records.
      </p>

      {/* THE THREE CARDS */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <ActionCard
          icon="users"
          iconBg="bg-gradient-to-br from-ink to-ink-deep"
          buttonBg="bg-ink hover:bg-ink-deep"
          title="Mark Attendance"
          description="Open the full member list and check everyone in."
          meta={isLoading ? 'Loading members…' : `${presentToday} of ${total} present today`}
          metaIcon="check"
          onClick={() => navigate('/attendance/all')}
        />
        <ActionCard
          icon="shield"
          iconBg="bg-gradient-to-br from-brass to-brass-deep"
          buttonBg="bg-brass-deep hover:brightness-110"
          title="Give Access"
          description="Let a volunteer take attendance from their own phone."
          meta={
            activeTakers === null
              ? 'Loading takers…'
              : `${activeTakers} active taker${activeTakers === 1 ? '' : 's'}`
          }
          metaIcon="user"
          onClick={() => navigate('/attendance/access')}
        />
        <ActionCard
          icon="chart"
          iconBg="bg-gradient-to-br from-tint-green-fg to-[#1E7A54]"
          buttonBg="bg-tint-green-fg hover:brightness-110"
          title="Attendance Data"
          description="Browse past services with counts and who was present."
          meta={
            recordedDates === null
              ? 'Loading records…'
              : `${recordedDates} date${recordedDates === 1 ? '' : 's'} recorded`
          }
          metaIcon="cal-check"
          onClick={() => navigate('/attendance/history')}
        />
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <StatCard icon="users" label="Total Members" value={isLoading ? '—' : String(total)} />
        <StatCard icon="check" label="Present Today" value={isLoading ? '—' : String(presentToday)} />
        <StatCard
          icon="cal-check"
          label="Sundays Recorded"
          value={recordedDates === null ? '—' : String(recordedDates)}
        />
      </div>
    </div>
  )
}

/** One hub card — bottom button carries the flow color (matches Announcements). */
function ActionCard({
  icon,
  iconBg,
  buttonBg,
  title,
  description,
  meta,
  metaIcon,
  onClick,
}: {
  icon: string
  iconBg: string
  buttonBg: string
  title: string
  description: string
  meta: string
  metaIcon: string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick()
      }}
      className="motion-safe:animate-[fade-rise_0.3s_ease-out_both] flex cursor-pointer flex-col rounded-2xl bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elev md:p-5"
    >
      <div className="flex items-center gap-3.5 md:flex-col md:items-start md:gap-0">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl md:mb-3 ${iconBg}`}>
          <Icon name={icon} className="icon !h-[21px] !w-[21px] text-white" />
        </span>
        <span className="min-w-0 flex-1 md:flex-none">
          <span className="block text-[14.5px] font-bold text-heading">{title}</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-slate">{description}</span>
          <span className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-brass-deep">
            <Icon name={metaIcon} className="icon !h-[11px] !w-[11px]" />
            {meta}
          </span>
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={`mt-3.5 w-full rounded-full py-2.5 text-[12px] font-bold text-white transition-transform hover:scale-[1.02] ${buttonBg}`}
      >
        {title}
      </button>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface p-2.5 text-center shadow-card transition-shadow hover:shadow-elev md:flex-row md:items-center md:gap-3 md:p-3.5 md:text-left">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep md:h-10 md:w-10">
        <Icon name={icon} className="icon !h-[14px] !w-[14px] text-white md:!h-[17px] md:!w-[17px]" />
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
