import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { useMembers } from '../features/members/MembersContext'
import { openWhatsappBroadcast, sanitizeWhatsappMessage } from '../templates/whatsapp'
import { fetchTokenCount, sendPushBroadcast } from '../notifications/api'
import { useMemberNotificationStatuses } from '../notifications/NotificationStatusBell'
import { CHURCH_INFO } from '../constants/church'
import { TEMPLATES, type Template } from '../templates/push/announcements'

const MAX_MESSAGE_LENGTH = 1000

type LinkEntry = { label: string; url: string }

function defaultLinkLabel(index: number): string {
  return index === 0 ? 'Join Here' : `Link ${index + 1}`
}

// *word* is WhatsApp's own bold markdown, applied by the WhatsApp client
// itself once the message is opened there — not styled by us. Template
// messages already carry their own greeting/signature, so this only adds
// the bold title on top and, if given, a link block at the bottom. Built
// from an array of lines joined with "\n" and run through the shared
// sanitizer so the preview is always exactly what gets sent.
function buildAnnouncementMessage(title: string, message: string, links: LinkEntry[]): string {
  const validLinks = links.filter((l) => l.url.trim())
  const lines: string[] = []
  if (title.trim()) {
    lines.push(`*${title.trim()}*`, '')
  }
  lines.push(message.trim() || 'Your announcement message will appear here.')
  validLinks.forEach((l, i) => {
    const label = l.label.trim() || defaultLinkLabel(i)
    lines.push('', `*${label}:*`, l.url.trim())
  })
  return sanitizeWhatsappMessage(lines.join('\n'))
}

export function AnnouncementsScreen() {
  const navigate = useNavigate()
  const { members, isLoading } = useMembers()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [links, setLinks] = useState<LinkEntry[]>([{ label: '', url: '' }])
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  // Once the admin edits the preview directly, it stops following title/message/link
  // changes and becomes the source of truth for what actually gets sent.
  const [previewOverride, setPreviewOverride] = useState<string | null>(null)
  // Push-notification delivery state: how many devices are registered, the
  // in-flight flag, the delivered count for the success modal, and any error.
  const [deviceCount, setDeviceCount] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState<number | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let cancelled = false
    fetchTokenCount()
      .then((count) => {
        if (!cancelled) setDeviceCount(count)
      })
      .catch(() => {
        if (!cancelled) setDeviceCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-resizes so the box always matches the actual message length —
  // recalculates on every change, including template picks, not just typing.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [message])

  const preview = previewOverride ?? buildAnnouncementMessage(title, message, links)

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [preview])

  const canSend = preview.trim().length > 0
  const memberCount = isLoading ? 0 : members.length

  // 🔔/🔕 stats — how many of the roster have push enabled vs not. Counted
  // against real member IDs so admin-device tokens don't inflate the number.
  const { data: notificationStatuses } = useMemberNotificationStatuses()
  const enabledMemberCount =
    notificationStatuses && !isLoading
      ? members.filter((m) => Boolean(notificationStatuses[m.memberId])).length
      : null
  const disabledMemberCount = enabledMemberCount === null ? null : memberCount - enabledMemberCount

  function applyTemplate(template: Template) {
    setTitle(template.title)
    setMessage(template.message)
    setPreviewOverride(null)
  }

  function clearForm() {
    setTitle('')
    setMessage('')
    setLinks([{ label: '', url: '' }])
    setPreviewOverride(null)
  }

  function updateLink(index: number, field: keyof LinkEntry, value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)))
  }

  function addLink() {
    setLinks((prev) => [...prev, { label: '', url: '' }])
  }

  function removeLink(index: number) {
    setLinks((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))
  }

  // Push body is plain text (no WhatsApp *bold* markdown). When the admin
  // hand-edited the preview, that edited text is the source of truth — the
  // markdown asterisks are just stripped for the notification.
  function buildPushContent(): { title: string; body: string; url?: string } {
    const validLinks = links.filter((l) => l.url.trim())
    const firstLink = validLinks[0]?.url.trim()
    if (previewOverride !== null) {
      return {
        title: title.trim() || CHURCH_INFO.shortName,
        body: previewOverride.replace(/\*/g, '').trim(),
        url: firstLink,
      }
    }
    const bodyLines = [message.trim()]
    validLinks.forEach((l, i) => {
      const label = l.label.trim() || defaultLinkLabel(i)
      bodyLines.push('', `${label}: ${l.url.trim()}`)
    })
    // Strip `*bold*` here too: a template applied without editing the preview
    // would otherwise leak literal asterisks into the push.
    return {
      title: (title.trim() || CHURCH_INFO.shortName).replace(/\*/g, ''),
      body: bodyLines.join('\n').replace(/\*/g, '').trim(),
      url: firstLink,
    }
  }

  /** Push the announcement to every registered device via Apps Script → FCM. */
  async function confirmSend() {
    setShowConfirm(false)
    setSendError(null)
    setSending(true)
    try {
      const result = await sendPushBroadcast(buildPushContent())
      setSentCount(result.sent)
      setShowSuccess(true)
    } catch (error) {
      console.error('[Announcements] Push send failed:', error)
      setSendError('Could not send the notification — check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  /** Secondary path — same composed message via a WhatsApp broadcast. */
  function sendViaWhatsapp() {
    openWhatsappBroadcast(preview)
  }

  return (
    <>
      <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-32 md:pb-24">
        {/* HEADER — title + gold-circle action button on the top row, one-line
            subtitle below, then a stats grid: same pattern as every other page. */}
        <div className="mb-1 flex items-center justify-between gap-3">
          {/* Smaller on phones — "Announcements" is a long word and at 22px it
              collides with the Schedule button on narrow screens. */}
          <h1 className="min-w-0 truncate font-display text-[18px] font-bold text-heading sm:text-[22px] md:text-[26px]">
            Announcements
          </h1>
          <button onClick={() => navigate('/announcements/schedule')} className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep shadow-card">
              <Icon name="cal-check" className="icon !h-[16px] !w-[16px] text-white" />
            </span>
            <span className="text-[12px] font-bold text-brass-deep">Schedule</span>
          </button>
        </div>
        <p className="mb-4 overflow-hidden whitespace-nowrap text-[10px] text-slate md:text-[12.5px]">
          Send updates and important information to your members.
        </p>

        <div className="mb-6 grid grid-cols-3 gap-2 md:gap-3">
          <AnnouncementStatCard icon="users" label="Total Members" value={isLoading ? '—' : String(memberCount)} />
          <AnnouncementStatCard
            icon="bell"
            label="Notifications Enabled"
            value={enabledMemberCount === null ? '—' : String(enabledMemberCount)}
          />
          <AnnouncementStatCard
            icon="bell-off"
            label="Notifications Disabled"
            value={disabledMemberCount === null ? '—' : String(disabledMemberCount)}
          />
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
          {/* ANNOUNCEMENT COMPOSER */}
          <div className="motion-safe:animate-[fade-rise_0.35s_ease-out_both] rounded-2xl bg-surface p-4 shadow-card md:p-5">
            <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
              <Icon name="megaphone" className="icon !h-[13px] !w-[13px] text-brass-deep" />
              Compose Announcement
            </div>

            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  onClick={() => applyTemplate(tpl)}
                  className="shrink-0 whitespace-nowrap rounded-full bg-paper px-3.5 py-2 text-[12px] font-bold text-heading transition-colors hover:bg-paper-2"
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            <label className="mb-3 block">
              <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
                Announcement Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sunday Service Time Change"
                className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate focus:border-ink"
              />
            </label>

            <label className="mb-3 block">
              <span className="mb-1.5 flex items-center justify-between text-[11.5px] font-bold uppercase tracking-wide text-slate">
                Message
                <span className={message.length > MAX_MESSAGE_LENGTH ? 'text-status-alert-fg' : 'text-faint'}>
                  {message.length} / {MAX_MESSAGE_LENGTH}
                </span>
              </span>
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={1}
                placeholder="Write your announcement…"
                className="w-full resize-none overflow-hidden rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate focus:border-ink"
              />
            </label>

            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-slate">
                <Icon name="link" className="icon !h-[11px] !w-[11px]" />
                Links{' '}
                <span className="font-normal capitalize text-faint">
                  (optional — YouTube, Facebook Live, Meet, Zoom, etc.)
                </span>
              </span>
              <div className="space-y-2.5">
                {links.map((l, i) => (
                  <div key={i} className="rounded-xl border border-hairline bg-paper p-2.5">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        value={l.label}
                        onChange={(e) => updateLink(i, 'label', e.target.value)}
                        placeholder={`Heading — e.g. ${defaultLinkLabel(i)}`}
                        className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px] font-bold text-heading outline-none transition-colors placeholder:font-normal placeholder:text-slate focus:border-ink"
                      />
                      {links.length > 1 && (
                        <button
                          onClick={() => removeLink(i)}
                          aria-label="Remove link"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:text-status-alert-fg"
                        >
                          <Icon name="x" className="icon !h-[13px] !w-[13px]" />
                        </button>
                      )}
                    </div>
                    <input
                      value={l.url}
                      onChange={(e) => updateLink(i, 'url', e.target.value)}
                      placeholder="https://…"
                      className="w-full rounded-lg border border-hairline bg-surface px-3 py-2 text-[13px] text-heading outline-none transition-colors placeholder:text-slate focus:border-ink"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={addLink}
                className="mt-2 flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-2 text-[12px] font-bold text-heading transition-colors hover:bg-paper-2"
              >
                <Icon name="plus" className="icon !h-[11px] !w-[11px]" />
                Add Link
              </button>
            </div>
          </div>

          {/* MESSAGE PREVIEW */}
          <div className="mt-5 lg:sticky lg:top-6 lg:mt-0">
            <div className="motion-safe:animate-[fade-rise_0.35s_ease-out_both] rounded-2xl bg-surface p-4 shadow-card md:p-5">
              <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
                <Icon name="whatsapp" className="icon !h-[13px] !w-[13px] text-[#25D366]" />
                Message Preview
                <span className="font-normal capitalize text-faint">(editable)</span>
              </h2>
              <textarea
                ref={previewRef}
                value={preview}
                onChange={(e) => setPreviewOverride(e.target.value)}
                rows={1}
                className="w-full resize-none overflow-hidden whitespace-pre-line rounded-2xl border border-hairline bg-paper p-4 text-[13px] leading-relaxed text-charcoal outline-none transition-colors focus:border-ink"
              />
              <p className="mt-2.5 text-[11px] text-slate">
                Exactly how members will receive this on WhatsApp — edit it here to fine-tune before sending.
              </p>
            </div>
          </div>
        </div>

        {showConfirm && (
          <ConfirmSendModal
            count={deviceCount ?? 0}
            scheduledLabel={null}
            onCancel={() => setShowConfirm(false)}
            onConfirm={confirmSend}
          />
        )}

        {showSuccess && (
          <SuccessModal
            sentCount={sentCount ?? 0}
            scheduledLabel={null}
            onSendAnother={() => {
              setShowSuccess(false)
              clearForm()
            }}
            onBackToDashboard={() => navigate('/')}
          />
        )}
      </div>

      {/* Rendered as a sibling of the animated wrapper above, not a descendant —
          a `transform` on an ancestor (even a finished fade-rise animation
          sitting at translateY(0)) creates its own containing block for
          position:fixed children, which would make this scroll with the
          page instead of staying pinned to the viewport. */}
      <div className="fixed inset-x-4 bottom-20 z-40 md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[420px] md:-translate-x-1/2">
        {sendError && (
          <p className="mb-2 rounded-xl bg-status-alert-bg px-3.5 py-2 text-center text-[12px] font-semibold text-status-alert-fg shadow-card">
            {sendError}
          </p>
        )}
        <div className="flex items-stretch gap-2">
          <button
            onClick={() => canSend && !sending && setShowConfirm(true)}
            disabled={!canSend || sending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-ink py-3.5 text-[14px] font-bold text-white shadow-elev transition-colors hover:bg-ink-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="bell" className="icon !h-[15px] !w-[15px]" />
            {sending
              ? 'Sending…'
              : `Send Notification${deviceCount !== null ? ` to ${deviceCount} Device${deviceCount === 1 ? '' : 's'}` : ''}`}
          </button>
          {/* Secondary path — WhatsApp Broadcast, kept while members transition to push */}
          <button
            onClick={() => canSend && sendViaWhatsapp()}
            disabled={!canSend}
            aria-label="Send via WhatsApp instead"
            title="Send via WhatsApp Broadcast"
            className="flex w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#25D366] shadow-elev transition-colors hover:bg-[#1FAF57] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="whatsapp" className="icon !h-[19px] !w-[19px] text-white" />
          </button>
        </div>
      </div>
    </>
  )
}

// Same stat-card treatment as the Members and Attendance pages — centered
// icon/number/label on mobile, horizontal row on desktop.
function AnnouncementStatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
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

function ConfirmSendModal({
  count,
  scheduledLabel,
  onCancel,
  onConfirm,
}: {
  count: number
  scheduledLabel: string | null
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
        className="motion-safe:animate-[scale-in_0.25s_ease-out_both] w-full max-w-[380px] rounded-[26px] bg-paper p-5 shadow-elev"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-paper-2">
          <Icon name={scheduledLabel ? 'cal-check' : 'bell'} className="icon !h-[19px] !w-[19px] text-brass-deep" />
        </span>
        <h3 className="font-display text-[16.5px] font-bold text-heading">
          {scheduledLabel
            ? `Schedule this notification for ${scheduledLabel}?`
            : `Send this notification to ${count} device${count === 1 ? '' : 's'}?`}
        </h3>
        <p className="mt-1.5 text-[13px] text-slate">
          {scheduledLabel
            ? 'It will be delivered automatically to every registered device around the chosen time (within 5 minutes).'
            : 'It will appear instantly as a push notification on every device that has enabled church notifications.'}
        </p>
        <div className="mt-4 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-hairline bg-surface py-3 text-[13px] font-bold text-heading transition-colors hover:bg-paper-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-ink py-3 text-[13px] font-bold text-white transition-colors hover:bg-ink-deep"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

function SuccessModal({
  sentCount,
  scheduledLabel,
  onSendAnother,
  onBackToDashboard,
}: {
  sentCount: number
  scheduledLabel: string | null
  onSendAnother: () => void
  onBackToDashboard: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="motion-safe:animate-[scale-in_0.3s_ease-out_both] w-full max-w-[380px] rounded-[26px] bg-paper p-6 text-center shadow-elev">
        <span className="motion-safe:animate-[scale-in_0.4s_ease-out_both] mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-regular-bg">
          <Icon name="check" className="icon !h-[28px] !w-[28px] text-status-regular-fg" />
        </span>
        <h3 className="font-display text-[19px] font-bold text-heading">
          {scheduledLabel ? 'Notification Scheduled' : 'Notification Sent'}
        </h3>
        <p className="mt-1.5 text-[13px] text-slate">
          {scheduledLabel
            ? `Will be delivered to all registered devices around ${scheduledLabel}.`
            : `Delivered to ${sentCount} device${sentCount === 1 ? '' : 's'}.`}
        </p>
        <div className="mt-5 flex flex-col gap-2.5">
          <button
            onClick={onSendAnother}
            className="flex items-center justify-center gap-1.5 rounded-full bg-ink py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-ink-deep"
          >
            <Icon name="megaphone" className="icon !h-[14px] !w-[14px]" />
            Send Another
          </button>
          <button
            onClick={onBackToDashboard}
            className="flex items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface py-3 text-[13.5px] font-bold text-heading transition-colors hover:bg-paper-2"
          >
            <Icon name="home" className="icon !h-[14px] !w-[14px]" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
