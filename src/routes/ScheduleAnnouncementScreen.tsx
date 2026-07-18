import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { schedulePushBroadcast } from '../notifications/api'
import { useTokenCount } from '../notifications/scheduleView'
import { TEMPLATES, type Template } from '../templates/push/announcements'
import { TELUGU_TEMPLATES } from '../templates/push/announcements-telugu'
import { CHURCH_INFO } from '../constants/church'
import {
  MAX_MESSAGE_LENGTH,
  FIELD_CLASS,
  LABEL_CLASS,
  StepSection,
  TemplateChips,
  LanguageToggle,
  type TemplateLanguage,
  SummaryRow,
  DateTimeChecklist,
  HighlightWhen,
  MessageArea,
  messageValidationError,
} from '../features/announcements/shared'
import logo from '../assets/slf_logo_cropped.png'

const ACCENT = 'bg-brass-deep' // this flow's identity color (brass)

/** "17 Jul, 6:30 PM" for a datetime-local value. */
function formatScheduleLabel(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

/**
 * Schedule composer — "Schedule Notification" on the Announcements hub.
 * Same numbered-step form as the quick-send page, plus a delivery date &
 * time; the Apps Script dispatcher delivers within ~5 minutes of the chosen
 * time.
 */
export function ScheduleAnnouncementScreen() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [templateKey, setTemplateKey] = useState<string | null>(null)
  const [lang, setLang] = useState<TemplateLanguage>('en')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [sendAt, setSendAt] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [scheduledFor, setScheduledFor] = useState<string | null>(null)
  const { data: deviceCount } = useTokenCount()

  const sendAtValid = sendAt !== '' && new Date(sendAt).getTime() > Date.now()
  const canSchedule = message.trim().length > 0 && sendAtValid
  // Emergency notices are exempt from the date/time requirement — an urgent
  // update doesn't always have a "when".
  const requireWhen = templateKey !== 'emergency-update'

  /** Gate: every announcement must carry a date and a time before it schedules. */
  function handleScheduleClick() {
    if (!canSchedule || scheduling) return
    const validationError = messageValidationError(message, requireWhen)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setShowConfirm(true)
  }

  function applyTemplate(template: Template) {
    setTemplateKey(template.key)
    setTitle(template.title)
    setMessage(template.message)
  }

  /** Switch template language — re-applies the selected template in the new one. */
  function changeLanguage(next: TemplateLanguage) {
    setLang(next)
    if (templateKey) {
      const tpl = (next === 'te' ? TELUGU_TEMPLATES : TEMPLATES).find((t) => t.key === templateKey)
      if (tpl) {
        setTitle(tpl.title)
        setMessage(tpl.message)
      }
    }
  }

  /**
   * The exact data-only push payload the dispatcher will send. Asterisks are
   * stripped — templates carry `*bold*` for WhatsApp, but a push shows them as
   * literal characters. The notification TITLE is the only line a phone
   * renders bold, so the church's full name always takes that slot (Telugu
   * name for Telugu messages); the admin's typed title leads the body.
   */
  function buildPushContent(): { title: string; body: string; url?: string } {
    const isTelugu = /[ఀ-౿]/.test(message)
    const bodyLines: string[] = []
    if (title.trim()) bodyLines.push(title.trim(), '')
    bodyLines.push(message.trim())
    if (link.trim()) bodyLines.push('', `Open the link: ${link.trim()}`)
    return {
      title: isTelugu ? 'సారా లివింగ్ ఫెయిత్ మినిస్ట్రీస్' : CHURCH_INFO.name,
      body: bodyLines.join('\n').replace(/\*/g, '').trim(),
      url: link.trim() || undefined,
    }
  }

  async function confirmSchedule() {
    setShowConfirm(false)
    setError(null)
    setScheduling(true)
    try {
      await schedulePushBroadcast({ ...buildPushContent(), sendAt: new Date(sendAt).toISOString() })
      // Refresh the shared schedule so the new entry shows up immediately in
      // the Next Notification hero and Upcoming lists (instead of after the
      // 5-minute cache window).
      queryClient.invalidateQueries({ queryKey: ['upcoming-schedule'] })
      setScheduledFor(sendAt)
    } catch (err) {
      console.error('[Schedule] Failed:', err)
      // Surface the real cause — an outdated backend answers "Unknown action",
      // which is a deployment problem, not a time problem.
      const message = err instanceof Error ? err.message : ''
      setError(
        message.includes('Unknown action')
          ? 'The Apps Script backend is outdated — paste the latest Code.gs and deploy a new version, then try again.'
          : message || 'Could not schedule the notification — check the time is in the future and try again.',
      )
    } finally {
      setScheduling(false)
    }
  }

  function resetForm() {
    setTemplateKey(null)
    setTitle('')
    setMessage('')
    setLink('')
    setSendAt('')
    setScheduledFor(null)
  }

  const pushPreview = buildPushContent()
  const scheduleLabel = scheduling
    ? 'Scheduling…'
    : sendAtValid
      ? `Schedule for ${formatScheduleLabel(sendAt)}`
      : 'Schedule Notification'

  return (
    <>
      <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] overflow-x-clip pb-16 md:pb-24">
        <PageBackHeader title="Schedule Notification" onBack={() => navigate('/announcements')} />
        <p className="-mt-2 mb-5 pl-11 text-[12px] text-slate">
          Compose now, deliver later — sent automatically at the chosen time.
        </p>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
          {/* THE FOUR STEPS */}
          <div className="min-w-0 space-y-4">
            <StepSection
              step={1}
              title="Choose a template"
              hint="optional"
              accent={ACCENT}
              action={<LanguageToggle lang={lang} accent={ACCENT} onChange={changeLanguage} />}
            >
              <TemplateChips
                selectedKey={templateKey}
                accent={ACCENT}
                templates={lang === 'te' ? TELUGU_TEMPLATES : TEMPLATES}
                onApply={applyTemplate}
              />
            </StepSection>

            <StepSection step={2} title="Write your message" accent={ACCENT}>
              <label className="mb-3 block">
                <span className={LABEL_CLASS}>Notification Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunday Service Reminder"
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
                  a date and a time; scheduling is blocked until both are in.
                  (Skipped for emergency notices, where it's optional.) */}
              {requireWhen && <DateTimeChecklist text={message} onChange={setMessage} />}
            </StepSection>

            <StepSection
              step={3}
              title="Add a link"
              hint="optional — opens when the notification is tapped"
              accent={ACCENT}
            >
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className={FIELD_CLASS} />
            </StepSection>

            <StepSection step={4} title="Pick the delivery time" accent={ACCENT}>
              <input
                type="datetime-local"
                value={sendAt}
                onChange={(e) => setSendAt(e.target.value)}
                className={FIELD_CLASS}
              />
              {sendAt !== '' && !sendAtValid && (
                <p className="mt-2 text-[11.5px] font-semibold text-status-alert-fg">
                  The scheduled time must be in the future.
                </p>
              )}
              {sendAtValid && (
                <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-status-regular-fg">
                  <Icon name="check" className="icon !h-[12px] !w-[12px]" />
                  Delivers around {formatScheduleLabel(sendAt)} (within 5 minutes).
                </p>
              )}
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
                    <span className="text-[10px] text-[#9AA0A6]">
                      · {sendAtValid ? formatScheduleLabel(sendAt) : 'now'}
                    </span>
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
              <SummaryRow icon="cal-check" label="Delivers" value={sendAtValid ? formatScheduleLabel(sendAt) : 'Pick a time'} />
              <SummaryRow icon="clock" label="Accuracy" value="Within 5 minutes" />
              <SummaryRow
                icon="bell"
                label="Reaches"
                value={deviceCount != null ? `${deviceCount} device${deviceCount === 1 ? '' : 's'}` : '—'}
              />
            </div>
          </div>
        </div>

      </div>

      {/* SCHEDULE — pinned to the bottom of the screen, always visible while
          the form scrolls. Sits above the mobile tab bar; on desktop it spans
          the content area beside the sidebar. Fixed sibling of the animated
          wrapper (an ancestor transform would break position:fixed). */}
      <div className="fixed inset-x-4 bottom-20 z-40 md:bottom-5 md:left-[16.5rem] md:right-10">
        {error && (
          <p className="mb-2 rounded-xl bg-status-alert-bg px-3.5 py-2.5 text-center text-[12.5px] font-semibold text-status-alert-fg shadow-card">
            {error}
          </p>
        )}
        <button
          onClick={handleScheduleClick}
          disabled={!canSchedule || scheduling}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-brass-deep py-4 text-[14.5px] font-bold text-white shadow-elev transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="cal-check" className="icon !h-[15px] !w-[15px]" />
          {scheduleLabel}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowConfirm(false)}>
          <div
            className="motion-safe:animate-[scale-in_0.25s_ease-out_both] w-full max-w-[380px] rounded-[26px] bg-paper p-5 shadow-elev"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-paper-2">
              <Icon name="cal-check" className="icon !h-[19px] !w-[19px] text-brass-deep" />
            </span>
            <h3 className="font-display text-[16.5px] font-bold text-heading">
              Schedule this notification for {formatScheduleLabel(sendAt)}?
            </h3>
            <p className="mt-1.5 text-[13px] text-slate">
              It will be delivered automatically to every registered device around the chosen time.
            </p>
            <div className="mt-4 flex gap-2.5">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-hairline bg-surface py-3 text-[13px] font-bold text-heading transition-colors hover:bg-paper-2"
              >
                Cancel
              </button>
              <button
                onClick={confirmSchedule}
                className="flex-1 rounded-xl bg-brass-deep py-3 text-[13px] font-bold text-white transition-all hover:brightness-110"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduledFor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="motion-safe:animate-[scale-in_0.3s_ease-out_both] w-full max-w-[380px] rounded-[26px] bg-paper p-6 text-center shadow-elev">
            <span className="motion-safe:animate-[scale-in_0.4s_ease-out_both] mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-status-regular-bg">
              <Icon name="check" className="icon !h-[28px] !w-[28px] text-status-regular-fg" />
            </span>
            <h3 className="font-display text-[19px] font-bold text-heading">Notification Scheduled</h3>
            <p className="mt-1.5 text-[13px] text-slate">
              Will be delivered to all registered devices around {formatScheduleLabel(scheduledFor)}.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                onClick={resetForm}
                className="flex items-center justify-center gap-1.5 rounded-full bg-brass-deep py-3 text-[13.5px] font-bold text-white transition-all hover:brightness-110"
              >
                <Icon name="cal-check" className="icon !h-[14px] !w-[14px]" />
                Schedule Another
              </button>
              <button
                onClick={() => navigate('/announcements')}
                className="flex items-center justify-center gap-1.5 rounded-full border border-hairline bg-surface py-3 text-[13.5px] font-bold text-heading transition-colors hover:bg-paper-2"
              >
                <Icon name="megaphone" className="icon !h-[14px] !w-[14px]" />
                Back to Announcements
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
