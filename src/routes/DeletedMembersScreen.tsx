import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { MobileBackButton } from '../components/ui/MobileBackButton'
import { useMembers } from '../features/members/MembersContext'
import {
  fetchDeletedMembers,
  restoreMemberRecord,
  purgeDeletedMemberRecord,
  type DeletedMemberRecord,
} from '../features/members/api'
import { useNotificationSettings, useSetMemberMuted } from '../notifications/useNotificationSettings'

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getFullYear()}`
}

/**
 * Admin "Deleted & Paused" page — two lists in one place:
 *  1. Deleted members (archived to the Deleted Members sheet) with the reason,
 *     plus Restore / Delete-forever.
 *  2. Members whose notifications an admin has paused, with Resume.
 */
export function DeletedMembersScreen() {
  const queryClient = useQueryClient()
  const { members } = useMembers()
  const { data: settings } = useNotificationSettings()
  const setMuted = useSetMemberMuted()

  const deletedQuery = useQuery({ queryKey: ['deleted-members'], queryFn: fetchDeletedMembers })
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['deleted-members'] })
    queryClient.invalidateQueries({ queryKey: ['members'] })
  }

  const restore = useMutation({
    mutationFn: (memberId: string) => restoreMemberRecord(memberId),
    onSettled: () => setBusyId(null),
    onSuccess: refresh,
  })
  const purge = useMutation({
    mutationFn: (memberId: string) => purgeDeletedMemberRecord(memberId),
    onSettled: () => setBusyId(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deleted-members'] }),
  })

  // Members an admin has paused — resolve the muted IDs to real member rows.
  const pausedMembers = useMemo(() => {
    const muted = settings?.muted ?? []
    if (muted.length === 0) return []
    return members.filter((m) => muted.includes(m.memberId))
  }, [members, settings])

  const deleted = deletedQuery.data ?? []

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <div className="mb-1 flex items-center gap-1">
        <MobileBackButton />
        <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">Deleted &amp; Paused</h1>
      </div>
      <p className="mb-5 text-[12.5px] text-slate">
        Members you've removed (kept here with the reason, restorable) and members whose notifications are
        currently paused.
      </p>

      {/* SECTION 1 — Deleted members */}
      <SectionHeader icon="trash" title="Deleted Members" count={deleted.length} tone="alert" />
      {deletedQuery.isLoading ? (
        <Skeleton className="mb-6 h-24 w-full rounded-2xl" />
      ) : deletedQuery.isError ? (
        <Card className="mb-6 p-5 text-center">
          <p className="text-[12.5px] text-slate">
            Could not load deleted members — deploy the latest Apps Script version, then reload.
          </p>
        </Card>
      ) : deleted.length === 0 ? (
        <EmptyCard icon="trash" text="No deleted members. Removed members will appear here." />
      ) : (
        <Card className="mb-6">
          {deleted.map((m: DeletedMemberRecord, i) => (
            <div
              key={`${m.memberId}-${i}`}
              className={`flex flex-col gap-2 px-3.5 py-3 sm:flex-row sm:items-center sm:gap-3 ${
                i < deleted.length - 1 ? 'border-b border-hairline' : ''
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-status-alert-bg">
                <Icon name="user" className="icon !h-[16px] !w-[16px] text-status-alert-fg" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="truncate text-[13px] font-semibold text-heading">{m.fullName}</span>
                  <span className="font-mono text-[10.5px] text-slate">{m.memberId}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate">Deleted {formatDate(m.deletedAt)}</div>
                {m.deleteReason && (
                  <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-paper px-2.5 py-1.5 text-[11.5px] text-charcoal">
                    <Icon name="note" className="icon !h-[12px] !w-[12px] mt-0.5 shrink-0 text-slate" />
                    <span className="min-w-0">{m.deleteReason}</span>
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => {
                    setBusyId(m.memberId)
                    restore.mutate(m.memberId)
                  }}
                  disabled={busyId === m.memberId}
                  className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[11.5px] font-bold text-white transition-colors hover:bg-ink-deep disabled:opacity-50"
                >
                  <Icon name="refresh" className="icon !h-[12px] !w-[12px]" />
                  Restore
                </button>
                <button
                  onClick={() => {
                    setBusyId(m.memberId)
                    purge.mutate(m.memberId)
                  }}
                  disabled={busyId === m.memberId}
                  title="Delete permanently"
                  aria-label={`Delete ${m.fullName} permanently`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-status-alert-fg transition-colors hover:bg-status-alert-bg disabled:opacity-50"
                >
                  <Icon name="trash" className="icon !h-[15px] !w-[15px]" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* SECTION 2 — Paused notifications */}
      <SectionHeader icon="bell-off" title="Notifications Paused" count={pausedMembers.length} tone="amber" />
      {pausedMembers.length === 0 ? (
        <EmptyCard icon="bell" text="No members are paused. Paused members receive no notifications until resumed." />
      ) : (
        <Card>
          {pausedMembers.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 px-3.5 py-3 ${
                i < pausedMembers.length - 1 ? 'border-b border-hairline' : ''
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-tint-amber-bg">
                <Icon name="bell-off" className="icon !h-[16px] !w-[16px] text-tint-amber-fg" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-heading">{m.name}</div>
                <div className="font-mono text-[10.5px] text-slate">{m.memberId}</div>
              </div>
              <button
                onClick={() => setMuted.mutate({ memberId: m.memberId, muted: false })}
                disabled={setMuted.isPending && setMuted.variables?.memberId === m.memberId}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-status-regular-fg px-3.5 py-1.5 text-[11.5px] font-bold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
              >
                <Icon name="bell" className="icon !h-[12px] !w-[12px]" />
                Resume
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  count,
  tone,
}: {
  icon: string
  title: string
  count: number
  tone: 'alert' | 'amber'
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <Icon name={icon} className={`icon !h-[16px] !w-[16px] ${tone === 'alert' ? 'text-status-alert-fg' : 'text-tint-amber-fg'}`} />
      <h2 className="font-display text-[15.5px] font-bold text-heading">{title}</h2>
      <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[11px] font-bold text-slate">{count}</span>
    </div>
  )
}

function EmptyCard({ icon, text }: { icon: string; text: string }) {
  return (
    <Card className="mb-6 flex flex-col items-center gap-2 p-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper-2">
        <Icon name={icon} className="icon !h-[19px] !w-[19px] text-faint" />
      </span>
      <p className="max-w-[300px] text-[12.5px] text-slate">{text}</p>
    </Card>
  )
}
