import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Dropdown } from '../components/ui/Dropdown'
import { Avatar } from '../components/ui/Avatar'
import { StatusPill } from '../components/ui/StatusPill'
import { Skeleton } from '../components/ui/Skeleton'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { useMembers } from '../features/members/MembersContext'
import { MINISTRY_OPTIONS } from '../features/members/types'
import { buildRemovalMessage, normalizeWhatsappNumber, openWhatsappWithText } from '../templates/whatsapp'
import { DeleteMemberModal } from '../features/members/DeleteMemberModal'
import { AddWhatsappModal } from '../features/members/AddWhatsappModal'
import { NotificationStatusBell } from '../notifications/NotificationStatusBell'
import { markMembersSeen } from '../hooks/useAlertCounts'
import {
  RowActionButtons,
  EmptyDirectoryState,
  normalize,
  normalizeDigits,
  sortMembers,
  SORT_OPTIONS,
  type SortKey,
} from './MembersScreen'
import type { Member } from '../mock/types'

// The full searchable/sortable directory, split out of the Members dashboard
// (which now just shows "Members (N)" + View All on mobile) — same reuse of
// RowActionButtons/EmptyDirectoryState/sort helpers as that page, so edit,
// delete, WhatsApp, and sorting behave identically wherever they're used.
export function MembersAllScreen() {
  const navigate = useNavigate()
  const { members, isLoading, isError, deleteMember, isDeleting, updateWhatsapp, isUpdating } = useMembers()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [toast, setToast] = useState<{ icon: string; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null)
  const [addingWhatsappFor, setAddingWhatsappFor] = useState<Member | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // Opening the full directory also counts as "seeing" the roster.
  useEffect(() => {
    if (!isLoading && !isError && members.length > 0) markMembersSeen(members)
  }, [isLoading, isError, members])

  function requestDelete(member: Member) {
    setPendingDelete(member)
  }

  async function runDelete(member: Member, reason: string) {
    setPendingDelete(null)
    if (reason) {
      const number = normalizeWhatsappNumber(member.whatsapp)
      if (number) {
        openWhatsappWithText(number, buildRemovalMessage(member, reason))
      } else {
        setToast({ icon: 'chat', message: `WhatsApp number is not available for ${member.name} — reason was not sent.` })
      }
    }
    setDeletingId(member.id)
    try {
      await deleteMember(member.memberId)
    } catch {
      setToast({ icon: 'trash', message: `Could not delete ${member.name} — check your connection and try again.` })
    } finally {
      setDeletingId(null)
    }
  }

  async function saveWhatsapp(member: Member, rawNumber: string) {
    try {
      await updateWhatsapp(member.memberId, rawNumber)
      setAddingWhatsappFor(null)
      setToast({ icon: 'chat', message: `WhatsApp number saved for ${member.name}.` })
    } catch {
      setToast({ icon: 'chat', message: `Could not save the number for ${member.name} — check your connection and try again.` })
    }
  }

  const filters = useMemo(
    () => [
      { key: 'all', label: 'All Members', count: members.length },
      ...MINISTRY_OPTIONS.map((ministry) => ({
        key: ministry,
        label: ministry,
        count: members.filter((m) => m.ministryInterests?.includes(ministry)).length,
      })),
    ],
    [members],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qId = normalize(query)
    const qDigits = normalizeDigits(query)
    return members.filter((m) => {
      const matchesFilter = filter === 'all' || m.ministryInterests?.includes(filter)
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        normalize(m.memberId).includes(qId) ||
        (qDigits.length > 0 &&
          (normalizeDigits(m.phone).includes(qDigits) || normalizeDigits(m.whatsapp).includes(qDigits)))
      return matchesFilter && matchesQuery
    })
  }, [members, filter, query])

  const filteredSorted = useMemo(() => sortMembers(filtered, sortKey), [filtered, sortKey])

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="All Members" onBack={() => navigate('/members')} />

      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-3.5 py-2 shadow-card transition-shadow focus-within:shadow-elev">
          <Icon name="search" className="icon !h-[17px] !w-[17px] text-slate" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, member ID, phone, or WhatsApp number…"
            className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-slate outline-none"
          />
        </div>

        <div className="shrink-0">
          <Dropdown
            value={filter}
            onChange={setFilter}
            align="right"
            options={filters.map((f) => ({ value: f.key, label: `${f.label} · ${f.count}` }))}
            triggerClassName="h-full rounded-2xl bg-surface py-2 pl-2.5 pr-2 text-[11px] font-semibold text-heading shadow-card"
          />
        </div>
      </div>

      <div className="mb-5 flex items-center justify-between gap-2 px-0.5">
        <span className="text-[11.5px] text-slate">
          <b className="font-mono font-semibold text-heading">{filteredSorted.length}</b>{' '}
          {filteredSorted.length === 1 ? 'member' : 'members'} found
        </span>
        <Dropdown
          value={sortKey}
          onChange={(v) => setSortKey(v as SortKey)}
          align="right"
          leadingIcon="sort"
          options={SORT_OPTIONS}
          triggerClassName="shrink-0 gap-1 rounded-full bg-surface/70 py-1 pl-2.5 pr-2 text-[10.5px] font-bold text-heading shadow-card"
        />
      </div>

      {isError && (
        <p className="py-8 text-center text-[13px] text-slate">
          Could not load members — check your connection.
        </p>
      )}

      {!isError && isLoading && (
        <div className="space-y-1.5 rounded-2xl bg-surface p-1.5 shadow-card">
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
          <MemberRowSkeleton />
        </div>
      )}

      {!isError && !isLoading && filteredSorted.length === 0 && (
        <EmptyDirectoryState onAdd={() => navigate('/members/new')} />
      )}

      {!isError && !isLoading && filteredSorted.length > 0 && (
        <div className="rounded-2xl bg-surface px-3.5 shadow-card">
          {filteredSorted.map((member) => (
            <CompactMemberRow
              key={member.id}
              member={member}
              navigate={navigate}
              onDelete={requestDelete}
              deleting={isDeleting && deletingId === member.id}
              onAddWhatsapp={setAddingWhatsappFor}
            />
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 motion-safe:animate-[fade-rise_0.3s_ease-out]">
          <div className="flex max-w-[92vw] items-center gap-2 rounded-full bg-ink-deep px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-elev">
            <Icon name={toast.icon} className="icon !h-[14px] !w-[14px] shrink-0 text-white" />
            <span className="truncate">{toast.message}</span>
          </div>
        </div>
      )}

      {pendingDelete && (
        <DeleteMemberModal
          member={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={(reason) => runDelete(pendingDelete, reason)}
        />
      )}

      {addingWhatsappFor && (
        <AddWhatsappModal
          member={addingWhatsappFor}
          onCancel={() => setAddingWhatsappFor(null)}
          onSave={(rawNumber) => saveWhatsapp(addingWhatsappFor, rawNumber)}
          saving={isUpdating}
        />
      )}
    </div>
  )
}

type CompactMemberRowProps = {
  member: Member
  navigate: ReturnType<typeof useNavigate>
  onDelete: (member: Member) => void
  deleting: boolean
  onAddWhatsapp: (member: Member) => void
}

// Same compact row the Members dashboard used to render inline — avatar,
// ID + status badge, name, phone, action icons, chevron. Tapping a person
// is unchanged: it still opens the full Member Profile page.
function CompactMemberRow({ member, navigate, onDelete, deleting, onAddWhatsapp }: CompactMemberRowProps) {
  const sinceYear = member.joinDate.slice(-4)
  return (
    <div
      onClick={() => navigate(`/members/${member.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/members/${member.id}`)
      }}
      className="flex cursor-pointer items-center gap-2 border-b border-hairline py-3.5 last:border-0 active:bg-paper/60"
    >
      <Avatar initials={member.initials} color={member.color} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-mono text-[13px] font-bold text-heading">{member.memberId}</span>
          <StatusPill status={member.status} label={member.statusLabel} size="sm" />
          <NotificationStatusBell memberId={member.memberId} />
        </div>
        <div className="mt-0.5 truncate text-[13px] text-heading">{member.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-slate">
          <span className="truncate">{member.phone}</span>
          <span className="h-1 w-1 shrink-0 rounded-full bg-faint" />
          <span className="shrink-0">Since {sinceYear}</span>
        </div>
      </div>
      <RowActionButtons
        member={member}
        navigate={navigate}
        onDelete={onDelete}
        deleting={deleting}
        onAddWhatsapp={onAddWhatsapp}
      />
      <Icon name="chevron" className="icon !h-[15px] !w-[15px] shrink-0 text-faint" />
    </div>
  )
}

function MemberRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 border-b border-hairline py-3.5 last:border-0">
      <Skeleton className="h-[42px] w-[42px] shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-[13px] w-[55%] rounded" />
        <Skeleton className="mt-1.5 h-[11px] w-[40%] rounded" />
      </div>
      <Skeleton className="h-[22px] w-16 shrink-0 rounded-full" />
    </div>
  )
}
