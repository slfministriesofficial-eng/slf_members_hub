import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '../components/ui/Icon'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { sendPushBroadcast } from '../notifications/api'
import { useTokenCount } from '../notifications/scheduleView'
import { CHURCH_INFO } from '../constants/church'
import type { Template } from '../templates/push/announcements'
import {
  MAX_MESSAGE_LENGTH,
  FIELD_CLASS,
  LABEL_CLASS,
  StepSection,
  TemplateChips,
  LinksEditor,
  SummaryRow,
  ConfirmSendModal,
  SuccessModal,
  DateTimeChecklist,
  HighlightWhen,
  MessageArea,
  messageValidationError,
  defaultLinkLabel,
  type LinkEntry,
} from '../features/announcements/shared'
import logo from '../assets/slf_logo_cropped.png'

const ACCENT = 'bg-ink' // this flow's identity color (navy)

/**
 * Quick-send push composer — "Send Quick Notification" on the Announcements
 * hub. A numbered three-step form with a live phone preview and a delivery
 * summary; sends instantly to every registered device.
 */
export function SendNotificationScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [templateKey, setTemplateKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [links, setLinks] = useState<LinkEntry[]>([{ label: '', url: '' }])
  const [showConfirm, setShowConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentCount, setSentCount] = useState<number | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const { data: deviceCount } = useTokenCount()

  function applyTemplate(template: Template) {
    setTemplateKey(template.key)
    setTitle(template.title)
    setMessage(template.message)
  }

  function clearForm() {
    setTemplateKey(null)
    setTitle('')
    setMessage('')
    setLinks([{ label: '', url: '' }])
  }

  /** The clean data-only push payload — `*bold*` stripped (that's WhatsApp's). */
  function buildPushContent(): { title: string; body: string; url?: string } {
    const validLinks = links.filter((l) => l.url.trim())
    const bodyLines = [message.trim()]
    validLinks.forEach((l, i) => {
      const label = l.label.trim() || defaultLinkLabel(i)
      bodyLines.push('', `${label}: ${l.url.trim()}`)
    })
    return {
      title: (title.trim() || CHURCH_INFO.shortName).replace(/\*/g, ''),
      body: bodyLines.join('\n').replace(/\*/g, '').trim(),
      url: validLinks[0]?.url.trim(),
    }
  }

  const pushPreview = buildPushContent()
  const canSend = message.trim().length > 0
  // Emergency notices are exempt from the date/time requirement — an urgent
  // update doesn't always have a "when".
  const requireWhen = templateKey !== 'emergency-update'

  /** Gate: every announcement must carry a date and a time before it sends. */
  function handleSendClick() {
    if (!canSend || sending) return
    const validationError = messageValidationError(message, requireWhen)
    if (validationError) {
      setSendError(validationError)
      return
    }
    setSendError(null)
    setShowConfirm(true)
  }

  async function confirmSend() {
    setShowConfirm(false)
    setSendError(null)
    setSending(true)
    try {
      const result = await sendPushBroadcast(buildPushContent())
      // The dashboard's "Notifications sent" card reads this cache — refresh
      // it so the new send shows up immediately.
      queryClient.invalidateQueries({ queryKey: ['notification-history'] })
      setSentCount(result.sent)
    } catch (error) {
      console.error('[SendNotification] Push send failed:', error)
      setSendError('Could not send the notification — check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  const sendLabel = sending
    ? 'Sending…'
    : `Send to ${deviceCount != null ? `${deviceCount} Device${deviceCount === 1 ? '' : 's'}` : 'All Devices'}`

  return (
    <>
      <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] overflow-x-clip pb-16 md:pb-24">
        <PageBackHeader title="Quick Notification" onBack={() => navigate('/announcements')} />
        <p className="-mt-2 mb-5 pl-11 text-[12px] text-slate">
          Delivered instantly to every device with church notifications enabled.
        </p>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
          {/* THE THREE STEPS */}
          <div className="min-w-0 space-y-4">
            <StepSection step={1} title="Choose a template" hint="optional" accent={ACCENT}>
              <TemplateChips selectedKey={templateKey} accent={ACCENT} onApply={applyTemplate} />
            </StepSection>

            <StepSection step={2} title="Write your message" accent={ACCENT}>
              <label className="mb-3 block">
                <span className={LABEL_CLASS}>Notification Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunday Service Time Change"
                  className={FIELD_CLASS}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-[12px] font-bold text-heading">
                  Message
                  <span
                    className={`text-[11px] font-semibold ${
                      message.length > MAX_MESSAGE_LENGTH ? 'text-status-alert-fg' : 'text-faint'
                    }`}
                  >
                    {message.length} / {MAX_MESSAGE_LENGTH}
                  </span>
                </span>
                <MessageArea value={message} onChange={setMessage} placeholder="Write your announcement…" />
              </label>
              {/* Members must know WHEN — live check that the message carries
                  a date and a time; sending is blocked until both are in.
                  (Skipped for emergency notices, where it's optional.) */}
              {requireWhen && <DateTimeChecklist text={message} />}
            </StepSection>

            <StepSection
              step={3}
              title="Add a link"
              hint="optional — opens when the notification is tapped"
              accent={ACCENT}
            >
              <LinksEditor links={links} onChange={setLinks} />
            </StepSection>
          </div>

          {/* PREVIEW + DELIVERY SUMMARY */}
          <div className="mt-5 min-w-0 space-y-4 lg:sticky lg:top-6 lg:mt-0">
            <div className="rounded-2xl bg-surface p-4 shadow-card md:p-5">
              <h2 className="mb-3 flex items-center gap-1.5 text-[12px] font-bold text-heading">
                <Icon name="bell" className="icon !h-[13px] !w-[13px] text-brass-deep" />
                Live Preview
              </h2>
              <div className="rounded-2xl bg-gradient-to-br from-ink-deep via-ink to-ink-soft p-4">
                <div className="rounded-2xl bg-white/95 p-3.5 shadow-elev">
                  <div className="flex items-center gap-1.5">
                    <span className="h-4 w-4 shrink-0 overflow-hidden rounded-full">
                      <img src={logo} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="text-[10px] font-semibold text-[#5F6368]">SLF Members Hub</span>
                    <span className="text-[10px] text-[#9AA0A6]">· now</span>
                  </div>
                  <p className="mt-1.5 truncate text-[12.5px] font-bold text-[#202124]">{pushPreview.title}</p>
                  {/* [overflow-wrap:anywhere] keeps long unbroken URLs inside
                      the bubble; HighlightWhen marks the date/time in gold so
                      the admin verifies the WHEN at a glance. */}
                  <p className="mt-0.5 line-clamp-4 whitespace-pre-line text-[11.5px] leading-snug text-[#5F6368] [overflow-wrap:anywhere]">
                    {pushPreview.body ? (
                      <HighlightWhen text={pushPreview.body} />
                    ) : (
                      'Your announcement message will appear here.'
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-surface p-4 shadow-card md:p-5">
              <h2 className="mb-1 text-[12px] font-bold text-heading">Delivery</h2>
              <SummaryRow
                icon="bell"
                label="Reaches"
                value={deviceCount != null ? `${deviceCount} device${deviceCount === 1 ? '' : 's'}` : '—'}
              />
              <SummaryRow icon="clock" label="Delivery" value="Instant" />
              <SummaryRow icon="users" label="Audience" value="All enabled devices" />
            </div>
          </div>
        </div>

      </div>

      {/* SEND — pinned to the bottom of the screen, always visible while the
          form scrolls. Sits above the mobile tab bar; on desktop it spans the
          content area beside the sidebar. Fixed sibling of the animated
          wrapper (an ancestor transform would break position:fixed). */}
      <div className="fixed inset-x-4 bottom-20 z-40 md:bottom-5 md:left-[16.5rem] md:right-10">
        {sendError && (
          <p className="mb-2 rounded-xl bg-status-alert-bg px-3.5 py-2.5 text-center text-[12.5px] font-semibold text-status-alert-fg shadow-card">
            {sendError}
          </p>
        )}
        <button
          onClick={handleSendClick}
          disabled={!canSend || sending}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-ink py-4 text-[14.5px] font-bold text-white shadow-elev transition-colors hover:bg-ink-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="bell" className="icon !h-[15px] !w-[15px]" />
          {sendLabel}
        </button>
      </div>

      {showConfirm && (
        <ConfirmSendModal count={deviceCount ?? 0} onCancel={() => setShowConfirm(false)} onConfirm={confirmSend} />
      )}

      {sentCount !== null && (
        <SuccessModal
          sentCount={sentCount}
          onSendAnother={() => {
            setSentCount(null)
            clearForm()
          }}
          onSchedule={() => navigate('/announcements/schedule')}
          onDone={() => navigate('/announcements')}
        />
      )}
    </>
  )
}
