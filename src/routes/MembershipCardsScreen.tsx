import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Dropdown } from '../components/ui/Dropdown'
import { MobileBackButton } from '../components/ui/MobileBackButton'
import { SkeletonIdCard, SkeletonListRow } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { MINISTRY_OPTIONS } from '../features/members/types'
import { IdCardFull } from '../features/members/IdCardFull'
import { useCardPdfDownload } from '../features/members/useCardPdfDownload'
import { normalizeWhatsappNumber, openWhatsappChat } from '../templates/whatsapp'
import type { Member } from '../mock/types'

const ZOOM_MIN = 60
const ZOOM_MAX = 150
const ZOOM_STEP = 10

function isSameMonth(dateStr: string | undefined, ref: Date): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return !Number.isNaN(d.getTime()) && d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()
}

// Strips punctuation/case so "SLF-0001", "slf0001", and "0001" all match the same member.
function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5 text-center shadow-card">
      <div className="font-display text-[18px] font-bold text-heading">{value}</div>
      <div className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate">{label}</div>
    </div>
  )
}

export function MembershipCardsScreen() {
  const { members, isLoading, isError } = useMembers()
  const [query, setQuery] = useState('')
  const [ministryFilter, setMinistryFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [switching, setSwitching] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [manualNumberFor, setManualNumberFor] = useState<string | null>(null)
  const [manualNumber, setManualNumber] = useState('')
  const [manualNumberError, setManualNumberError] = useState<string | null>(null)
  const switchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (switchTimeout.current) clearTimeout(switchTimeout.current)
    }
  }, [])

  useEffect(() => {
    if (!expanded) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [expanded])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const qId = normalize(query)
    return members.filter((m) => {
      const matchesQuery =
        !q || m.name.toLowerCase().includes(q) || normalize(m.memberId).includes(qId) || m.phone.includes(q)
      const matchesMinistry = ministryFilter === 'all' || m.ministryInterests?.includes(ministryFilter)
      return matchesQuery && matchesMinistry
    })
  }, [members, query, ministryFilter])

  const selected: Member | undefined = members.find((m) => m.id === selectedId)

  // Print-ready PDF export of the selected member's card (shared with the admin
  // profile + public profile pages). Called only when a member is selected.
  const {
    downloadPdf,
    isPreparing: downloadingPdf,
    error: downloadError,
    captureNodes,
  } = useCardPdfDownload({
    name: selected?.name ?? '',
    memberId: selected?.memberId ?? '',
    mobile: selected?.phone,
    bloodGroup: selected?.bloodGroup,
    status: selected?.status ?? 'regular',
    statusLabel: selected?.statusLabel ?? 'Member',
    sinceYear: selected?.joinDate.slice(-4),
  })

  const stats = useMemo(() => {
    const now = new Date()
    return {
      total: members.length,
      newThisMonth: members.filter((m) => isSameMonth(m.registrationDate, now)).length,
    }
  }, [members])

  // List highlight updates instantly for responsiveness; the preview itself gets
  // a brief skeleton flash before swapping — selection is instant (no network
  // call) so this is purely a short visual transition, not a real loading wait.
  function selectMember(id: string) {
    if (id === highlightedId) return
    setHighlightedId(id)
    cancelManualNumber()
    if (switchTimeout.current) clearTimeout(switchTimeout.current)
    setSwitching(true)
    switchTimeout.current = setTimeout(() => {
      setSelectedId(id)
      setZoom(100)
      setSwitching(false)
    }, 350)
  }

  // On mobile the list and the card are one-at-a-time (master → detail): this
  // returns to the list. On desktop both stay side by side, so it's unused.
  function backToList() {
    if (switchTimeout.current) clearTimeout(switchTimeout.current)
    setSwitching(false)
    setHighlightedId(null)
    setSelectedId(null)
  }

  // Sends the member's own digital profile link straight to their personal
  // WhatsApp number, pre-filled with the full welcome message — standard
  // wa.me deep link, so it works unchanged on WhatsApp Web, Android, and iOS.
  // When no number is on file, opens an inline field to take one on the spot
  // instead of just refusing, so the admin isn't blocked mid-task.
  function sendToWhatsApp(member: Member) {
    const number = normalizeWhatsappNumber(member.whatsapp)
    if (!number) {
      setManualNumberFor(member.id)
      setManualNumber('')
      setManualNumberError(null)
      return
    }
    openWhatsappChat(member, number)
  }

  function submitManualNumber(member: Member) {
    const number = normalizeWhatsappNumber(manualNumber)
    if (!number) {
      setManualNumberError('Enter a valid WhatsApp number.')
      return
    }
    cancelManualNumber()
    openWhatsappChat(member, number)
  }

  function cancelManualNumber() {
    setManualNumberFor(null)
    setManualNumber('')
    setManualNumberError(null)
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-1">
            <MobileBackButton />
            <h1 className="font-display text-[20px] font-bold text-heading md:text-[24px]">Membership Cards</h1>
          </div>
          <p className="mt-1 text-[12.5px] text-slate">Manage, preview and share digital membership cards.</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 md:w-[240px] md:shrink-0">
          <StatCard label="Total Cards" value={stats.total} />
          <StatCard label="New This Month" value={stats.newThisMonth} />
        </div>
      </div>

      {isError && (
        <p className="py-8 text-center text-[13px] text-slate">
          Could not load members — check your connection.
        </p>
      )}

      {!isError && (
        <div className="md:grid md:grid-cols-[300px_1fr] md:items-start md:gap-5 lg:grid-cols-[35%_65%] lg:gap-6">
          {/* Left column (35%) — search, ministry filter, member list.
              On mobile it's hidden once a member is picked (the card takes over,
              master → detail); on desktop both columns stay side by side. */}
          <div className={`mb-5 md:mb-0 ${highlightedId ? 'hidden md:block' : ''}`}>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 shadow-card">
                <Icon name="search" className="icon !h-[17px] !w-[17px] text-slate" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, phone, or ID…"
                  className="w-full bg-transparent text-[13px] text-charcoal placeholder:text-slate outline-none"
                />
              </div>

              <div className="shrink-0">
                <Dropdown
                  value={ministryFilter}
                  onChange={setMinistryFilter}
                  align="right"
                  options={[
                    { value: 'all', label: 'All Ministries' },
                    ...MINISTRY_OPTIONS.map((ministry) => ({ value: ministry, label: ministry })),
                  ]}
                  triggerClassName="h-full rounded-2xl bg-surface py-2.5 pl-3.5 pr-3 text-[12.5px] font-semibold text-heading shadow-card"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-1.5 rounded-2xl bg-surface p-1.5 shadow-card">
                <SkeletonListRow />
                <SkeletonListRow />
                <SkeletonListRow />
                <SkeletonListRow />
              </div>
            ) : filtered.length === 0 ? (
              <p className="rounded-2xl bg-surface p-4 text-center text-[12.5px] text-slate shadow-card">
                No members match.
              </p>
            ) : (
              <div className="max-h-[70vh] space-y-1.5 overflow-y-auto pr-0.5 md:max-h-none md:overflow-visible">
                {filtered.map((member) => (
                  <div
                    key={member.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectMember(member.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') selectMember(member.id)
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2 rounded-xl border-2 px-3.5 py-3 text-left transition-colors ${
                      highlightedId === member.id
                        ? 'border-brass bg-brass/10'
                        : 'border-transparent bg-surface shadow-card hover:bg-paper'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-bold text-heading">{member.name}</span>
                        {member.ministry !== '—' && (
                          <span className="shrink-0 rounded-full bg-paper-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate">
                            {member.ministry}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10.5px] text-slate">
                        {member.memberId} · Member since {member.joinDate.slice(-4)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        selectMember(member.id)
                      }}
                      className="flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-ink-deep"
                    >
                      <Icon name="id" className="icon !h-[12px] !w-[12px]" />
                      View ID
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column (65%) — preview panel. Intentionally not another filled
              card: just a hairline border on a transparent background, so the ID
              card itself stays the visual focus instead of competing with a box.
              Sized to its natural content height — the page itself scrolls (via
              AppShell), so a second fixed-height scroll region here only risked
              clipping the card whenever the header above it took up more or less
              space than the hardcoded estimate assumed. */}
          <div
            className={`rounded-2xl border border-hairline p-4 md:p-6 ${
              highlightedId ? '' : 'hidden md:block'
            }`}
          >
            {/* Mobile-only "back to list" — desktop keeps both panes visible. */}
            <button
              onClick={backToList}
              className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-brass-deep md:hidden"
            >
              <Icon name="arrow-left" className="icon !h-[16px] !w-[16px]" />
              Back to list
            </button>
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-[16px] font-bold text-heading">Membership Card Preview</h2>
                <p className="mt-0.5 text-[12px] text-slate">
                  Preview the selected member's digital membership card.
                </p>
              </div>
              {!isLoading && !switching && selected && (
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface p-1 shadow-card">
                  <button
                    onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                    aria-label="Zoom out"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate hover:bg-paper"
                  >
                    <Icon name="minus" className="icon !h-[13px] !w-[13px]" />
                  </button>
                  <button
                    onClick={() => setZoom(100)}
                    aria-label="Reset zoom"
                    className="px-1.5 font-mono text-[10.5px] font-semibold text-slate hover:text-heading"
                  >
                    {zoom}%
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                    aria-label="Zoom in"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate hover:bg-paper"
                  >
                    <Icon name="plus" className="icon !h-[13px] !w-[13px]" />
                  </button>
                  <span className="mx-0.5 h-4 w-px bg-hairline" />
                  <button
                    onClick={() => setExpanded(true)}
                    aria-label="Expand to full page"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate hover:bg-paper"
                  >
                    <Icon name="expand" className="icon !h-[13px] !w-[13px]" />
                  </button>
                </div>
              )}
            </div>

            {!isLoading && !switching && selected && (
              <div className="mb-2 flex flex-col items-center gap-2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={downloadPdf}
                    disabled={downloadingPdf}
                    className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-4 py-2 text-[12.5px] font-bold text-heading transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="download" className="icon !h-[15px] !w-[15px]" />
                    {downloadingPdf ? 'Preparing PDF…' : 'Download as PDF'}
                  </button>
                  <button
                    onClick={() => sendToWhatsApp(selected)}
                    className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-[12.5px] font-bold text-white shadow-card transition-colors hover:bg-[#1FAF57]"
                  >
                    <Icon name="chat" className="icon !h-[15px] !w-[15px]" />
                    Send to WhatsApp
                  </button>
                </div>
                {manualNumberFor === selected.id && (
                  <div className="flex w-full max-w-[320px] flex-col items-center gap-1.5 rounded-2xl bg-status-alert-bg p-3">
                    <p className="text-center text-[11.5px] font-semibold text-status-alert-fg">
                      WhatsApp number is not available for this member — enter one to send now.
                    </p>
                    <div className="flex w-full items-center gap-1.5">
                      <input
                        autoFocus
                        type="tel"
                        value={manualNumber}
                        onChange={(e) => setManualNumber(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitManualNumber(selected)
                        }}
                        placeholder="90000 54321"
                        className="flex-1 rounded-full border border-hairline bg-surface px-3.5 py-2 text-[12.5px] text-heading outline-none focus:border-ink"
                      />
                      <button
                        onClick={() => submitManualNumber(selected)}
                        aria-label="Send to WhatsApp"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white transition-colors hover:bg-[#1FAF57]"
                      >
                        <Icon name="chat" className="icon !h-[15px] !w-[15px]" />
                      </button>
                      <button
                        onClick={cancelManualNumber}
                        aria-label="Cancel"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate hover:bg-paper"
                      >
                        <Icon name="x" className="icon !h-[13px] !w-[13px]" />
                      </button>
                    </div>
                    {manualNumberError && (
                      <p className="text-[11px] font-semibold text-status-alert-fg">{manualNumberError}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col items-center justify-center">
              {isLoading || switching ? (
                <div className="mx-auto w-full max-w-[420px]">
                  <SkeletonIdCard />
                </div>
              ) : !selected ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-paper-2">
                    <Icon name="id" className="icon !h-[26px] !w-[26px] text-faint" />
                  </span>
                  <h3 className="font-display text-[15px] font-bold text-heading">Select a Member</h3>
                  <p className="max-w-[240px] text-[12.5px] text-slate">
                    Choose a member from the list to preview the membership card.
                  </p>
                </div>
              ) : (
                <div
                  className="mx-auto w-full max-w-[420px] transition-transform duration-200"
                  style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
                >
                  <IdCardFull
                    name={selected.name}
                    memberId={selected.memberId}
                    mobile={selected.phone}
                    bloodGroup={selected.bloodGroup}
                    status={selected.status}
                    statusLabel={selected.statusLabel}
                    sinceYear={selected.joinDate.slice(-4)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {expanded && selected && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-6">
          <button
            onClick={() => setExpanded(false)}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-elev"
          >
            <Icon name="x" className="icon !h-[18px] !w-[18px] text-heading" />
          </button>
          <div className="max-h-[88vh] w-[92vw] max-w-[440px] overflow-y-auto">
            <IdCardFull
              name={selected.name}
              memberId={selected.memberId}
              mobile={selected.phone}
              bloodGroup={selected.bloodGroup}
              status={selected.status}
              statusLabel={selected.statusLabel}
              sinceYear={selected.joinDate.slice(-4)}
            />
          </div>
        </div>
      )}

      {/* Off-screen capture source for the PDF export (from useCardPdfDownload). */}
      {selected && captureNodes}

      {downloadError && (
        <div className="fixed inset-x-0 bottom-8 z-40 flex justify-center px-4 motion-safe:animate-[fade-rise_0.3s_ease-out]">
          <div className="flex max-w-[92vw] items-center gap-2 rounded-full bg-ink-deep px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-elev">
            <Icon name="download" className="icon !h-[14px] !w-[14px] shrink-0 text-white" />
            <span className="truncate">{downloadError}</span>
          </div>
        </div>
      )}
    </div>
  )
}
