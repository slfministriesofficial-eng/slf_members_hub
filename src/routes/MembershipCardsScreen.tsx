import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Dropdown } from '../components/ui/Dropdown'
import { MobileBackButton } from '../components/ui/MobileBackButton'
import { SkeletonIdCard, SkeletonListRow } from '../components/ui/Skeleton'
import { useMembers } from '../features/members/MembersContext'
import { MINISTRY_OPTIONS } from '../features/members/types'
import { IdCardFull } from '../features/members/IdCardFull'
import { IdCard } from '../features/members/IdCard'
import { IdCardBack } from '../features/members/IdCardBack'
import { normalizeWhatsappNumber, openWhatsappChat } from '../templates/whatsapp'
import type { Member } from '../mock/types'

const ZOOM_MIN = 60
const ZOOM_MAX = 150
const ZOOM_STEP = 10

// Real CR80 card size (the standard ID/membership card format) — the PDF page
// is set to exactly this, in millimeters, so a print shop gets a file that
// prints at true physical size instead of guessing a DPI from raw pixels.
const CARD_WIDTH_MM = 85.6
const CARD_HEIGHT_MM = 54

// html2canvas can't reliably capture the flipper's 3D-rotated back face, so
// the export renders its own flat, off-screen front/back pair (same data,
// no rotateY) purely to be captured — never shown to the user.
//
// MUST equal the card's authored design width: the card's inner sizes (logo,
// fonts, QR, padding) are fixed pixels tuned for this width — the same base the
// on-screen preview scales from. Capturing at any other width shrinks the
// content and leaves it clustered at the top. Print resolution comes from
// html2canvas's `scale` below, not from inflating this width.
const CAPTURE_WIDTH_PX = 500

// Upscales the 500px capture so the CR80 PDF prints crisp (500 × 4 = 2000px ≈
// 590 DPI at 85.6mm — well past print-sharp, and keeps the QR cleanly scannable).
const CAPTURE_SCALE = 4

// Waits for every <img> inside el to finish loading (the QR code and card
// photos render async) so html2canvas never captures a still-blank image.
function waitForImages(el: HTMLElement, timeoutMs = 3000): Promise<void> {
  const imgs = Array.from(el.querySelectorAll('img'))
  const pending = imgs.filter((img) => !img.complete)
  if (pending.length === 0) return Promise.resolve()
  return Promise.race([
    Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true })
            img.addEventListener('error', () => resolve(), { once: true })
          }),
      ),
    ).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ])
}

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
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const switchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const captureFrontRef = useRef<HTMLDivElement>(null)
  const captureBackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (switchTimeout.current) clearTimeout(switchTimeout.current)
    }
  }, [])

  useEffect(() => {
    if (!downloadError) return
    const t = setTimeout(() => setDownloadError(null), 4000)
    return () => clearTimeout(t)
  }, [downloadError])

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

  // Captures the hidden, flat (non-flipped) front/back copies of the card and
  // lays them into a 2-page PDF sized to real CR80 card dimensions, so the
  // file is print-ready rather than just a couple of arbitrary-size images.
  async function downloadCardPdf(member: Member) {
    if (!captureFrontRef.current || !captureBackRef.current) return
    setDownloadingPdf(true)
    setDownloadError(null)
    try {
      // html2canvas-pro (drop-in fork): the original html2canvas can't parse
      // Tailwind v4's color-mix()/oklch() colours (which the card uses heavily
      // via opacity modifiers like brass/70), so it threw and the PDF silently
      // failed. The pro fork renders those colours correctly.
      const [html2canvasModule, jsPdfModule] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ])
      const html2canvas = html2canvasModule.default
      const { jsPDF } = jsPdfModule

      await Promise.all([waitForImages(captureFrontRef.current), waitForImages(captureBackRef.current)])

      const [frontCanvas, backCanvas] = await Promise.all([
        html2canvas(captureFrontRef.current, { scale: CAPTURE_SCALE, backgroundColor: '#ffffff', useCORS: true }),
        html2canvas(captureBackRef.current, { scale: CAPTURE_SCALE, backgroundColor: '#ffffff', useCORS: true }),
      ])

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_WIDTH_MM, CARD_HEIGHT_MM] })
      pdf.addImage(frontCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM)
      pdf.addPage([CARD_WIDTH_MM, CARD_HEIGHT_MM], 'landscape')
      pdf.addImage(backCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM)
      pdf.save(`${member.name.replace(/\s+/g, '-')}-membership-card.pdf`)
    } catch {
      setDownloadError('Could not generate the PDF — please try again.')
    } finally {
      setDownloadingPdf(false)
    }
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
                    onClick={() => downloadCardPdf(selected)}
                    disabled={downloadingPdf}
                    className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-4 py-2 text-[12.5px] font-bold text-heading transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon name="download" className="icon !h-[15px] !w-[15px]" />
                    {downloadingPdf ? 'Preparing PDF…' : 'Download PDF'}
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

      {/* Off-screen, un-flipped front/back pair used only as the PDF export's
          capture source — see the note on CAPTURE_WIDTH_PX above. */}
      {selected && (
        <div className="fixed left-[-9999px] top-0" aria-hidden="true">
          <div ref={captureFrontRef} style={{ width: CAPTURE_WIDTH_PX }}>
            <IdCard
              name={selected.name}
              memberId={selected.memberId}
              mobile={selected.phone}
              bloodGroup={selected.bloodGroup}
              status={selected.status}
              statusLabel={selected.statusLabel}
              sinceYear={selected.joinDate.slice(-4)}
            />
          </div>
          <div ref={captureBackRef} style={{ width: CAPTURE_WIDTH_PX }}>
            <IdCardBack />
          </div>
        </div>
      )}

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
