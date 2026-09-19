import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Avatar } from '../components/ui/Avatar'
import { Dropdown } from '../components/ui/Dropdown'
import { MobileBackButton } from '../components/ui/MobileBackButton'
import { SkeletonListRow } from '../components/ui/Skeleton'
import { StatusPill } from '../components/ui/StatusPill'
import { TopAction } from '../components/ui/TopAction'
import { usePastors } from '../features/pastors/PastorsContext'
import { PASTOR_STATUS_TONE, type Pastor, type PastorStatus } from '../features/pastors/types'

/** A status straight off the sheet, defaulted for rows saved before the
 *  column existed (or hand-edited to something unexpected). */
function statusOf(pastor: Pastor): PastorStatus {
  return pastor.status === 'Verified' || pastor.status === 'Approved' ? pastor.status : 'Pending'
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-surface p-2.5 text-center shadow-card md:p-3.5">
      <span className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brass to-brass-deep md:h-8 md:w-8">
        <Icon name={icon} className="icon !h-[14px] !w-[14px] text-white" />
      </span>
      <div className="font-mono text-[17px] font-bold leading-none text-heading md:text-[20px]">{value}</div>
      <div className="mt-1 text-[9.5px] leading-tight text-slate md:text-[10.5px]">{label}</div>
    </div>
  )
}

function PastorRow({ pastor, onOpen }: { pastor: Pastor; onOpen: () => void }) {
  const status = statusOf(pastor)
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 border-b border-hairline py-2.5 text-left last:border-0"
    >
      <Avatar initials={pastor.initials} color={pastor.color} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-heading">{pastor.fullName}</span>
        <span className="block truncate text-[11px] text-slate">
          {pastor.churchName || '—'}
          {pastor.ministryLocation ? ` · ${pastor.ministryLocation}` : ''}
        </span>
      </span>
      <StatusPill status={PASTOR_STATUS_TONE[status]} label={status} size="sm" />
      <Icon name="chevron" className="icon !h-[15px] !w-[15px] shrink-0 text-faint" />
    </button>
  )
}

function PastorCard({ pastor, onOpen }: { pastor: Pastor; onOpen: () => void }) {
  const status = statusOf(pastor)
  return (
    <button
      onClick={onOpen}
      className="flex flex-col rounded-2xl bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elev"
    >
      <div className="flex items-start gap-3">
        <Avatar initials={pastor.initials} color={pastor.color} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-heading">{pastor.fullName}</div>
          <div className="truncate font-mono text-[11px] text-slate">{pastor.memberId}</div>
        </div>
        <StatusPill status={PASTOR_STATUS_TONE[status]} label={status} size="sm" />
      </div>
      <div className="mt-3 space-y-1 border-t border-hairline pt-3">
        <div className="flex items-center gap-2 text-[12px] text-charcoal">
          <Icon name="building" className="icon !h-[13px] !w-[13px] shrink-0 text-faint" />
          <span className="truncate">{pastor.churchName || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-charcoal">
          <Icon name="pin" className="icon !h-[13px] !w-[13px] shrink-0 text-faint" />
          <span className="truncate">{pastor.ministryLocation || pastor.villageTownCity || '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-charcoal">
          <Icon name="phone" className="icon !h-[13px] !w-[13px] shrink-0 text-faint" />
          <span className="truncate">{pastor.mobile || '—'}</span>
        </div>
      </div>
    </button>
  )
}

const FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Verified', label: 'Verified' },
  { value: 'Approved', label: 'Approved' },
]

/**
 * Pastors Fellowship register — search, filter by approval stage, and open a
 * pastor. Kept as one page (no separate "view all"): this register is an order
 * of magnitude smaller than the member directory, so paging it would be noise.
 */
export function PastorsScreen() {
  const navigate = useNavigate()
  const { pastors, isLoading, isError } = usePastors()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return pastors.filter((p) => {
      if (filter !== 'all' && statusOf(p) !== filter) return false
      if (!q) return true
      return [p.fullName, p.memberId, p.churchName, p.denomination, p.ministryLocation, p.mobile]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(q))
    })
  }, [pastors, query, filter])

  const stats = useMemo(
    () => ({
      total: pastors.length,
      pending: pastors.filter((p) => statusOf(p) === 'Pending').length,
      approved: pastors.filter((p) => statusOf(p) === 'Approved').length,
      churches: new Set(pastors.map((p) => p.churchName).filter(Boolean)).size,
    }),
    [pastors],
  )

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      {/* Mobile header */}
      <div className="mb-1 flex items-center justify-between gap-3 md:hidden">
        <div className="flex min-w-0 items-center gap-1">
          <MobileBackButton />
          <h1 className="font-display text-[22px] font-bold text-heading">Pastors</h1>
        </div>
        <TopAction icon="plus" label="Add Pastor" onClick={() => navigate('/pastors/new')} />
      </div>
      <p className="mb-3 overflow-hidden whitespace-nowrap text-[10px] text-slate md:hidden">
        The SLF Ministries Pastors Fellowship register.
      </p>

      {/* Desktop header */}
      <div className="mb-5 hidden md:flex md:items-start md:justify-between md:gap-4">
        <div>
          <h1 className="font-display text-[26px] font-bold text-heading">Pastors Fellowship</h1>
          <p className="mt-1 text-[12.5px] text-slate">
            Register, verify and approve pastors joining the SLF Ministries fellowship.
          </p>
        </div>
        <TopAction icon="plus" label="Add New Pastor" onClick={() => navigate('/pastors/new')} />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-3.5 py-2 shadow-card transition-shadow focus-within:shadow-elev">
          <Icon name="search" className="icon !h-[17px] !w-[17px] text-slate" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, church, denomination, or phone…"
            className="w-full bg-transparent text-[13px] text-charcoal outline-none placeholder:text-slate"
          />
        </div>
        <div className="shrink-0">
          <Dropdown
            value={filter}
            onChange={setFilter}
            align="right"
            options={FILTERS.map((f) => ({
              value: f.value,
              label:
                f.value === 'all'
                  ? `All · ${pastors.length}`
                  : `${f.label} · ${pastors.filter((p) => statusOf(p) === f.value).length}`,
            }))}
            triggerClassName="h-full rounded-2xl bg-surface py-2 pl-2.5 pr-2 text-[11px] font-semibold text-heading shadow-card"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2 md:gap-3">
        <StatCard icon="cross" label="Total Pastors" value={stats.total} />
        <StatCard icon="clock" label="Pending" value={stats.pending} />
        <StatCard icon="check" label="Approved" value={stats.approved} />
        <StatCard icon="building" label="Churches" value={stats.churches} />
      </div>

      {isError && (
        <p className="py-8 text-center text-[13px] text-slate">
          Could not load the pastors register — check your connection, and make sure the latest Apps
          Script version is deployed.
        </p>
      )}

      {!isError && isLoading && (
        <div className="rounded-2xl bg-surface px-3.5 shadow-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonListRow key={i} />
          ))}
        </div>
      )}

      {!isError && !isLoading && filtered.length === 0 && (
        <div className="rounded-2xl bg-surface px-6 py-12 text-center shadow-card">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep">
            <Icon name="cross" className="icon !h-[20px] !w-[20px] text-white" />
          </span>
          <p className="text-[13.5px] font-bold text-heading">
            {pastors.length === 0 ? 'No pastors registered yet' : 'No pastors match this search'}
          </p>
          <p className="mx-auto mt-1 max-w-[320px] text-[12px] text-slate">
            {pastors.length === 0
              ? 'Transcribe a signed Pastors Fellowship form to add the first one.'
              : 'Try a different name, church, or approval stage.'}
          </p>
          {pastors.length === 0 && (
            <button
              onClick={() => navigate('/pastors/new')}
              className="mx-auto mt-4 flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-[12.5px] font-bold text-white transition-transform hover:scale-105"
            >
              <Icon name="plus" className="icon !h-[14px] !w-[14px]" />
              Add Pastor
            </button>
          )}
        </div>
      )}

      {!isError && !isLoading && filtered.length > 0 && (
        <>
          {/* Mobile: compact rows. Desktop: cards, matching the member directory. */}
          <div className="rounded-2xl bg-surface px-3.5 shadow-card md:hidden">
            {filtered.map((pastor) => (
              <PastorRow key={pastor.id} pastor={pastor} onOpen={() => navigate(`/pastors/${pastor.id}`)} />
            ))}
          </div>
          <div className="hidden md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-3">
            {filtered.map((pastor) => (
              <PastorCard key={pastor.id} pastor={pastor} onOpen={() => navigate(`/pastors/${pastor.id}`)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
