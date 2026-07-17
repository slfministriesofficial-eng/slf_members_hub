import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { schedulePushBroadcast } from '../notifications/api'
import { TEMPLATES, type Template } from './AnnouncementsScreen'
import { CHURCH_INFO } from '../constants/church'
import logo from '../assets/slf_logo_cropped.png'

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
 * Dedicated page for scheduling an announcement push — reached from the
 * Schedule button on the Announcements page. Compose (same templates as the
 * main composer), pick a future date & time, preview exactly how the
 * notification will look on a member's phone, and confirm. The Apps Script
 * dispatcher delivers it within ~5 minutes of the chosen time.
 */
export function ScheduleAnnouncementScreen() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [sendAt, setSendAt] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [scheduledFor, setScheduledFor] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resizes to the message length — same behavior as the main composer.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [message])

  const sendAtValid = sendAt !== '' && new Date(sendAt).getTime() > Date.now()
  const canSchedule = message.trim().length > 0 && sendAtValid

  function applyTemplate(template: Template) {
    setTitle(template.title)
    setMessage(template.message)
  }

  /**
   * The exact data-only push payload the dispatcher will send. Asterisks are
   * stripped — templates carry `*bold*` for WhatsApp, but a push shows them as
   * literal characters, so the preview and the sent text are both cleaned.
   */
  function buildPushContent(): { title: string; body: string; url?: string } {
    const bodyLines = [message.trim()]
    if (link.trim()) bodyLines.push('', `Open the link: ${link.trim()}`)
    return {
      title: (title.trim() || CHURCH_INFO.shortName).replace(/\*/g, ''),
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
    setTitle('')
    setMessage('')
    setLink('')
    setSendAt('')
    setScheduledFor(null)
  }

  const pushPreview = buildPushContent()

  return (
    <>
      <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-32 md:pb-24">
        <PageBackHeader title="Schedule Notification" onBack={() => navigate('/announcements')} />
        <p className="-mt-2 mb-4 pl-11 text-[12px] text-slate">
          Compose now, deliver later — sent automatically at the chosen time.
        </p>

        <div className="lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">
          {/* COMPOSER */}
          <div className="rounded-2xl bg-surface p-4 shadow-card md:p-5">
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
                Notification Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sunday Service Reminder"
                className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate focus:border-ink"
              />
            </label>

            <label className="mb-3 block">
              <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
                Message
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

            <label className="mb-3 block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-slate">
                <Icon name="link" className="icon !h-[11px] !w-[11px]" />
                Link <span className="font-normal capitalize text-faint">(optional — opens when tapped)</span>
              </span>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate focus:border-ink"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wide text-slate">
                <Icon name="cal-check" className="icon !h-[11px] !w-[11px]" />
                Send Date &amp; Time
              </span>
              <input
                type="datetime-local"
                value={sendAt}
                onChange={(e) => setSendAt(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors focus:border-ink"
              />
              {sendAt !== '' && !sendAtValid && (
                <p className="mt-1.5 text-[11px] font-semibold text-status-alert-fg">
                  The scheduled time must be in the future.
                </p>
              )}
              {sendAtValid && (
                <p className="mt-1.5 text-[11px] text-slate">
                  Will be delivered around {formatScheduleLabel(sendAt)} (within 5 minutes of the chosen time).
                </p>
              )}
            </label>
          </div>

          {/* NOTIFICATION PREVIEW */}
          <div className="mt-5 lg:sticky lg:top-6 lg:mt-0">
            <div className="rounded-2xl bg-surface p-4 shadow-card md:p-5">
              <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate">
                <Icon name="bell" className="icon !h-[13px] !w-[13px] text-brass-deep" />
                Notification Preview
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
                  <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-[11.5px] leading-snug text-[#5F6368]">
                    {pushPreview.body || 'Your announcement message will appear here.'}
                  </p>
                </div>
              </div>
              <p className="mt-2.5 text-[11px] text-slate">
                How the notification will appear on a member's phone at the scheduled time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed sibling (not descendant) of the animated wrapper — ancestor
          transforms would otherwise break position:fixed. */}
      <div className="fixed inset-x-4 bottom-20 z-40 md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[420px] md:-translate-x-1/2">
        {error && (
          <p className="mb-2 rounded-xl bg-status-alert-bg px-3.5 py-2 text-center text-[12px] font-semibold text-status-alert-fg shadow-card">
            {error}
          </p>
        )}
        <button
          onClick={() => canSchedule && !scheduling && setShowConfirm(true)}
          disabled={!canSchedule || scheduling}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-ink py-3.5 text-[14px] font-bold text-white shadow-elev transition-colors hover:bg-ink-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="cal-check" className="icon !h-[15px] !w-[15px]" />
          {scheduling ? 'Scheduling…' : sendAtValid ? `Schedule for ${formatScheduleLabel(sendAt)}` : 'Schedule Notification'}
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
                className="flex-1 rounded-xl bg-ink py-3 text-[13px] font-bold text-white transition-colors hover:bg-ink-deep"
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
                className="flex items-center justify-center gap-1.5 rounded-full bg-ink py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-ink-deep"
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
