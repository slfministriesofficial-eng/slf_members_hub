import { useEffect, useMemo, useState } from 'react'
import { useNavigate, type NavigateFunction } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Dropdown } from '../components/ui/Dropdown'
import { Avatar } from '../components/ui/Avatar'
import { StatusPill } from '../components/ui/StatusPill'
import { Skeleton } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { MINISTRY_OPTIONS } from '../features/members/types'
import {
  buildRemovalMessage,
  normalizeWhatsappNumber,
  openWhatsappChat,
  openWhatsappWithText,
} from '../features/members/whatsapp'
import { DeleteMemberModal } from '../features/members/DeleteMemberModal'
import { AddWhatsappModal } from '../features/members/AddWhatsappModal'
import type { Member } from '../mock/types'

type ViewMode = 'list' | 'grid'

const VIEW_STORAGE_KEY = 'slf-members-view'

// Strips punctuation/case so "SLF-0001", "slf0001", and "0001" all match the same member.
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function isSameMonth(dateStr: string | undefined, ref: Date): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return !Number.isNaN(d.getTime()) && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()
}

function sortByName(list: Member[]): Member[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
}

function getInitialView(): ViewMode {
  if (typeof window === 'undefined') return 'list'
  return window.sessionStorage.getItem(VIEW_STORAGE_KEY) === 'grid' ? 'grid' : 'list'
}

export function MembersScreen() {
  const { members, isLoading, isError, deleteMember, isDeleting, updateWhatsapp, isUpdating } = useMembers()
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewMode>(getInitialView)
  const [toast, setToast] = useState<{ icon: string; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Member | null>(null)
  const [addingWhatsappFor, setAddingWhatsappFor] = useState<Member | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  function changeView(next: ViewMode) {
    setView(next)
    window.sessionStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  // Opens the confirm-with-reason modal — the actual delete only happens once
  // that's confirmed, via runDelete below.
  function requestDelete(member: Member) {
    setPendingDelete(member)
  }

  // Sends the WhatsApp notice (if a reason was given) BEFORE the delete
  // mutation is awaited, so window.open still runs inside the click's
  // original user-gesture — awaiting first would risk the popup being blocked.
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

  // Filtered by ministry interest rather than member/visitor/leader status —
  // every registered person is treated as a member, so that distinction isn't used here.
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

  const filteredSorted = useMemo(() => sortByName(filtered), [filtered])

  const stats = useMemo(() => {
    const now = new Date()
    return {
      total: members.length,
      newThisMonth: members.filter((m) => isSameMonth(m.registrationDate, now)).length,
      families: members.filter((m) => m.familyCount).length,
      baptized: members.filter((m) => m.baptized).length,
    }
  }, [members])

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both]">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">Members</h1>
          <p className="mt-1 text-[12.5px] text-slate">
            Manage, search, filter, and access all church members from one place.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <ViewToggle view={view} onChange={changeView} />
          <button
            onClick={() => navigate('/members/new')}
            className="motion-safe:animate-[gradient-drift_5s_ease_infinite] flex shrink-0 items-center gap-1.5 rounded-full bg-[length:300%_300%] bg-gradient-to-r from-brass via-[#E4C57E] to-brass-deep px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_10px_20px_rgba(184,134,58,0.4)] transition-transform hover:scale-105"
          >
            <Icon name="plus" className="icon !h-[15px] !w-[15px] text-white" />
            Add New Member
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-card transition-shadow focus-within:shadow-elev">
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
            triggerClassName="h-full rounded-2xl bg-surface py-2.5 pl-3.5 pr-3 text-[12.5px] font-semibold text-heading shadow-card"
          />
        </div>
      </div>

      <div className="mb-5 px-0.5">
        <span className="text-[11.5px] text-slate">
          <b className="font-mono font-semibold text-heading">{filteredSorted.length}</b>{' '}
          {filteredSorted.length === 1 ? 'member' : 'members'} found
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        <DirectoryStatCard icon="users" label="Total Members" value={stats.total} />
        <DirectoryStatCard icon="cal-check" label="New This Month" value={stats.newThisMonth} />
        <DirectoryStatCard icon="rings" label="Families" value={stats.families} />
        <DirectoryStatCard icon="cross" label="Baptized Members" value={stats.baptized} />
      </div>

      {isError && (
        <p className="py-8 text-center text-[13px] text-slate">
          Could not load members — check your connection.
        </p>
      )}

      {!isError && isLoading && (
        <>
          <div className="space-y-1.5 rounded-2xl bg-surface p-1.5 shadow-card md:hidden">
            <MobileRowSkeleton />
            <MobileRowSkeleton />
            <MobileRowSkeleton />
            <MobileRowSkeleton />
            <MobileRowSkeleton />
          </div>
          <div
            className={`hidden md:grid md:gap-3 ${
              view === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-1'
            }`}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <DirectoryCardSkeleton key={i} variant={view} />
            ))}
          </div>
        </>
      )}

      {!isError && !isLoading && filteredSorted.length === 0 && (
        <EmptyDirectoryState onAdd={() => navigate('/members/new')} />
      )}

      {!isError && !isLoading && filteredSorted.length > 0 && (
        <>
          <div className="rounded-2xl bg-surface px-3.5 shadow-card md:hidden">
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

          <div
            className={`hidden md:grid md:gap-3 ${
              view === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-1'
            }`}
          >
            {filteredSorted.map((member, i) =>
              view === 'grid' ? (
                <MemberGridCard
                  key={member.id}
                  member={member}
                  navigate={navigate}
                  onDelete={requestDelete}
                  deleting={isDeleting && deletingId === member.id}
                  delayMs={Math.min(i, 8) * 40}
                  onAddWhatsapp={setAddingWhatsappFor}
                />
              ) : (
                <MemberListRow
                  key={member.id}
                  member={member}
                  navigate={navigate}
                  onDelete={requestDelete}
                  deleting={isDeleting && deletingId === member.id}
                  delayMs={Math.min(i, 8) * 40}
                  onAddWhatsapp={setAddingWhatsappFor}
                />
              ),
            )}
          </div>
        </>
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-8 motion-safe:animate-[fade-rise_0.3s_ease-out]">
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

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="hidden items-center gap-1 rounded-full bg-surface p-1 shadow-card md:flex">
      <button
        onClick={() => onChange('list')}
        aria-label="List view"
        aria-pressed={view === 'list'}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          view === 'list' ? 'bg-ink-deep text-white' : 'text-slate hover:bg-paper'
        }`}
      >
        <Icon name="menu" className="icon !h-[15px] !w-[15px]" />
      </button>
      <button
        onClick={() => onChange('grid')}
        aria-label="Grid view"
        aria-pressed={view === 'grid'}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          view === 'grid' ? 'bg-ink-deep text-white' : 'text-slate hover:bg-paper'
        }`}
      >
        <Icon name="grid" className="icon !h-[15px] !w-[15px]" />
      </button>
    </div>
  )
}

function DirectoryStatCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-elev">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep">
        <Icon name={icon} className="icon !h-[17px] !w-[17px] text-white" />
      </span>
      <div className="min-w-0">
        <div className="font-display text-[19px] font-bold leading-none text-heading">{value}</div>
        <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wide text-slate">{label}</div>
      </div>
    </div>
  )
}

function FamilyBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-paper-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate">
      <Icon name="rings" className="icon !h-[10px] !w-[10px]" />
      +{count} Family
    </span>
  )
}

function ActiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-status-regular-bg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-status-regular-fg">
      <span className="h-1.5 w-1.5 rounded-full bg-status-regular-fg" />
      Active
    </span>
  )
}

// Direct icon buttons — Edit, Delete, and (only when the member actually has
// a WhatsApp number on file) Send WhatsApp — right-aligned on every row
// variant. Always visible rather than tucked behind a "more" menu, since
// these three (plus the chevron) cover everything admins reach for on this
// list. Stops propagation on its own root so tapping any of them never also
// fires the card's own "navigate to profile" handler.
function RowActionButtons({
  member,
  navigate,
  onDelete,
  deleting,
  onAddWhatsapp,
}: {
  member: Member
  navigate: NavigateFunction
  onDelete: (member: Member) => void
  deleting: boolean
  onAddWhatsapp: (member: Member) => void
}) {
  const whatsappNumber = normalizeWhatsappNumber(member.whatsapp)

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => navigate(`/members/${member.id}/edit`)}
        aria-label="Edit member"
        title="Edit Member"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:bg-paper hover:text-heading"
      >
        <Icon name="pencil" className="icon !h-[15px] !w-[15px]" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(member)}
        disabled={deleting}
        aria-label="Delete member"
        title="Delete Member"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-status-alert-fg transition-colors hover:bg-status-alert-bg disabled:opacity-40"
      >
        <Icon name="trash" className="icon !h-[15px] !w-[15px]" />
      </button>
      {whatsappNumber ? (
        <button
          type="button"
          onClick={() => openWhatsappChat(member, whatsappNumber)}
          aria-label="Send WhatsApp"
          title="Send WhatsApp"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#25D366] transition-colors hover:bg-[#25D366]/10"
        >
          <Icon name="chat" className="icon !h-[15px] !w-[15px]" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onAddWhatsapp(member)}
          aria-label="Add WhatsApp number"
          title="Add WhatsApp Number"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:bg-paper hover:text-heading"
        >
          <Icon name="plus" className="icon !h-[15px] !w-[15px]" />
        </button>
      )}
    </div>
  )
}

type MemberCardProps = {
  member: Member
  navigate: NavigateFunction
  onDelete: (member: Member) => void
  deleting: boolean
  onAddWhatsapp: (member: Member) => void
  delayMs?: number
}

// Mobile-only compact row — avatar, name, ID, ministry, status badge, the
// quick action icon buttons (Edit / Delete / WhatsApp-if-available), and an
// arrow — per the responsive spec.
function CompactMemberRow({ member, navigate, onDelete, deleting, onAddWhatsapp }: MemberCardProps) {
  return (
    <div
      onClick={() => navigate(`/members/${member.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/members/${member.id}`)
      }}
      className="flex cursor-pointer items-center gap-1.5 border-b border-hairline py-3.5 last:border-0 active:bg-paper/60"
    >
      <Avatar initials={member.initials} color={member.color} size={42} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold text-heading">{member.name}</div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-slate">
          {member.memberId} · {member.ministry}
        </div>
      </div>
      <StatusPill status={member.status} label={member.statusLabel} size="sm" />
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

// Desktop list variant — a full-width premium row. Edit/Delete/WhatsApp sit
// always-visible at the trailing end, before the chevron.
function MemberListRow({ member, navigate, onDelete, deleting, onAddWhatsapp, delayMs = 0 }: MemberCardProps) {
  const sinceYear = member.joinDate.slice(-4)
  return (
    <div
      onClick={() => navigate(`/members/${member.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/members/${member.id}`)
      }}
      style={{ animationDelay: `${delayMs}ms` }}
      className="motion-safe:animate-[fade-rise_0.35s_ease-out_both] flex cursor-pointer items-center gap-4 rounded-2xl bg-surface p-4 shadow-card transition-shadow hover:shadow-elev"
    >
      <Avatar initials={member.initials} color={member.color} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[14.5px] font-bold text-heading">{member.name}</span>
          {member.familyCount ? <FamilyBadge count={member.familyCount} /> : null}
          <ActiveBadge />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate">
          <span>{member.memberId}</span>
          <span className="h-1 w-1 rounded-full bg-faint" />
          <span className="font-body">{member.ministry}</span>
          <span className="h-1 w-1 rounded-full bg-faint" />
          <span>Since {sinceYear}</span>
        </div>
      </div>
      <RowActionButtons
        member={member}
        navigate={navigate}
        onDelete={onDelete}
        deleting={deleting}
        onAddWhatsapp={onAddWhatsapp}
      />
      <Icon name="chevron" className="icon !h-[16px] !w-[16px] shrink-0 text-faint" />
    </div>
  )
}

// Desktop grid variant — a vertical tile. Edit/Delete/WhatsApp sit
// always-visible in the top-right corner instead of a trailing position.
function MemberGridCard({ member, navigate, onDelete, deleting, onAddWhatsapp, delayMs = 0 }: MemberCardProps) {
  const sinceYear = member.joinDate.slice(-4)
  return (
    <div
      onClick={() => navigate(`/members/${member.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/members/${member.id}`)
      }}
      style={{ animationDelay: `${delayMs}ms` }}
      className="motion-safe:animate-[fade-rise_0.35s_ease-out_both] relative flex cursor-pointer flex-col items-center rounded-2xl bg-surface p-5 text-center shadow-card transition-shadow hover:shadow-elev"
    >
      <div className="absolute right-2.5 top-2.5">
        <RowActionButtons
          member={member}
          navigate={navigate}
          onDelete={onDelete}
          deleting={deleting}
          onAddWhatsapp={onAddWhatsapp}
        />
      </div>

      <Avatar initials={member.initials} color={member.color} size={56} />
      <div className="mt-3 max-w-full truncate text-[14.5px] font-bold text-heading">{member.name}</div>
      <div className="mt-0.5 font-mono text-[11px] text-slate">{member.memberId}</div>
      <span className="mt-2 max-w-full truncate rounded-full bg-paper-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate">
        {member.ministry}
      </span>
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
        {member.familyCount ? <FamilyBadge count={member.familyCount} /> : null}
        <ActiveBadge />
      </div>
      <div className="mt-2 text-[10.5px] italic text-slate">Member since {sinceYear}</div>
    </div>
  )
}

function MobileRowSkeleton() {
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

function DirectoryCardSkeleton({ variant }: { variant: ViewMode }) {
  if (variant === 'grid') {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-5 shadow-card">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="mt-2 h-3.5 w-24 rounded" />
        <Skeleton className="h-3 w-16 rounded" />
        <Skeleton className="mt-1 h-5 w-20 rounded-full" />
      </div>
    )
  }
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40 rounded" />
        <Skeleton className="h-3 w-56 rounded" />
      </div>
    </div>
  )
}

function EmptyDirectoryState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-14 text-center shadow-card">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-2">
        <Icon name="users" className="icon !h-[28px] !w-[28px] text-faint" />
      </span>
      <h3 className="font-display text-[17px] font-bold text-heading">No Members Found</h3>
      <p className="max-w-[260px] text-[12.5px] text-slate">Try changing your search or filter.</p>
      <button
        onClick={onAdd}
        className="mt-2 motion-safe:animate-[gradient-drift_5s_ease_infinite] flex items-center gap-1.5 rounded-full bg-[length:300%_300%] bg-gradient-to-r from-brass via-[#E4C57E] to-brass-deep px-5 py-2.5 text-[12.5px] font-bold text-white shadow-[0_10px_20px_rgba(184,134,58,0.4)] transition-transform hover:scale-105"
      >
        <Icon name="plus" className="icon !h-[15px] !w-[15px] text-white" />
        Add New Member
      </button>
    </div>
  )
}
