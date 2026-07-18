import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { openWhatsappBroadcast } from '../templates/whatsapp'
import type { Template } from '../templates/push/announcements'
import {
  MAX_MESSAGE_LENGTH,
  FIELD_CLASS,
  LABEL_CLASS,
  StepSection,
  TemplateChips,
  LinksEditor,
  SummaryRow,
  DateTimeChecklist,
  MessageArea,
  messageValidationError,
  buildWhatsappAnnouncement,
  type LinkEntry,
} from '../features/announcements/shared'

const ACCENT = 'bg-[#25D366]' // this flow's identity color (WhatsApp green)

/**
 * WhatsApp announcement composer — "Send on WhatsApp" on the Announcements
 * hub. Same numbered-step form as the push composers, with the preview shown
 * as a real WhatsApp chat bubble (editable — *bold* renders as bold there).
 * Deliberately no bulk auto-send: that would require the WhatsApp Business
 * API, which this app avoids. The admin picks the group inside WhatsApp.
 */
export function WhatsappAnnouncementScreen() {
  const navigate = useNavigate()
  const [templateKey, setTemplateKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [links, setLinks] = useState<LinkEntry[]>([{ label: '', url: '' }])
  // Once the admin edits the preview bubble directly, it becomes the source of truth.
  const [previewOverride, setPreviewOverride] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLTextAreaElement>(null)

  const preview = previewOverride ?? buildWhatsappAnnouncement(title, message, links)

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [preview])

  const canSend = preview.trim().length > 0
  // Emergency notices are exempt from the date/time requirement — an urgent
  // update doesn't always have a "when".
  const requireWhen = templateKey !== 'emergency-update'

  function applyTemplate(template: Template) {
    setTemplateKey(template.key)
    setTitle(template.title)
    setMessage(template.message)
    setPreviewOverride(null)
  }

  /** Gate: every announcement must carry a date and a time before it opens WhatsApp. */
  function handleOpenWhatsapp() {
    if (!canSend) return
    const validationError = messageValidationError(preview, requireWhen)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    openWhatsappBroadcast(preview)
  }

  return (
    <>
      <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] overflow-x-clip pb-16 md:pb-24">
        <PageBackHeader title="WhatsApp Broadcast" onBack={() => navigate('/announcements')} />
        <p className="-mt-2 mb-5 pl-11 text-[12px] text-slate">
          Compose here, then choose the group or broadcast list inside WhatsApp.
        </p>

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
          {/* THE THREE STEPS */}
          <div className="min-w-0 space-y-4">
            <StepSection step={1} title="Choose a template" hint="optional" accent={ACCENT}>
              <TemplateChips selectedKey={templateKey} accent={ACCENT} onApply={applyTemplate} />
            </StepSection>

            <StepSection step={2} title="Write your message" accent={ACCENT}>
              <label className="mb-3 block">
                <span className={LABEL_CLASS}>Announcement Title</span>
                <input
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value)
                    setPreviewOverride(null)
                  }}
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
                <MessageArea
                  value={message}
                  onChange={(next) => {
                    setMessage(next)
                    setPreviewOverride(null)
                  }}
                  placeholder="Write your announcement…"
                />
              </label>
              {/* Members must know WHEN — live check that the message carries
                  a date and a time; opening WhatsApp is blocked until both are in.
                  (Skipped for emergency notices, where it's optional.) */}
              {requireWhen && <DateTimeChecklist text={preview} />}
            </StepSection>

            <StepSection step={3} title="Add links" hint="optional — YouTube, Meet, Zoom, etc." accent={ACCENT}>
              <LinksEditor
                links={links}
                onChange={(next) => {
                  setLinks(next)
                  setPreviewOverride(null)
                }}
              />
            </StepSection>
          </div>

          {/* WHATSAPP-STYLE PREVIEW + SUMMARY */}
          <div className="mt-5 min-w-0 space-y-4 lg:sticky lg:top-6 lg:mt-0">
            <div className="rounded-2xl bg-surface p-4 shadow-card md:p-5">
              <h2 className="mb-3 flex items-center gap-1.5 text-[12px] font-bold text-heading">
                <Icon name="whatsapp" className="icon !h-[13px] !w-[13px] text-[#25D366]" />
                Live Preview
                <span className="font-normal text-faint">(editable)</span>
              </h2>
              {/* WhatsApp chat backdrop with the message as an outgoing bubble —
                  the textarea IS the bubble, so fine-tuning happens in place. */}
              <div className="rounded-2xl bg-[#E5DDD5] p-3">
                <textarea
                  ref={previewRef}
                  value={preview}
                  onChange={(e) => setPreviewOverride(e.target.value)}
                  rows={1}
                  className="w-full resize-none overflow-hidden whitespace-pre-line rounded-xl rounded-tr-[4px] border-0 bg-[#DCF8C6] p-3.5 text-[13px] leading-relaxed text-[#111B21] shadow-card outline-none ring-0 transition-shadow focus:shadow-elev"
                />
              </div>
              <p className="mt-2.5 text-[11px] text-slate">
                Exactly what WhatsApp receives — the *stars* become <strong>bold</strong> there. Tap the
                bubble to fine-tune.
              </p>
            </div>

            <div className="rounded-2xl bg-surface p-4 shadow-card md:p-5">
              <h2 className="mb-1 text-[12px] font-bold text-heading">How it sends</h2>
              <SummaryRow icon="whatsapp" label="Opens" value="WhatsApp app" />
              <SummaryRow icon="users" label="You choose" value="Group / broadcast list" />
              <SummaryRow icon="pencil" label="Formatting" value="Bold applied by WhatsApp" />
            </div>
          </div>
        </div>

      </div>

      {/* OPEN IN WHATSAPP — pinned to the bottom of the screen, always
          visible while the form scrolls. Sits above the mobile tab bar; on
          desktop it spans the content area beside the sidebar. Fixed sibling
          of the animated wrapper (an ancestor transform would break
          position:fixed). */}
      <div className="fixed inset-x-4 bottom-20 z-40 md:bottom-5 md:left-[16.5rem] md:right-10">
        {error && (
          <p className="mb-2 rounded-xl bg-status-alert-bg px-3.5 py-2.5 text-center text-[12.5px] font-semibold text-status-alert-fg shadow-card">
            {error}
          </p>
        )}
        <button
          onClick={handleOpenWhatsapp}
          disabled={!canSend}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#25D366] py-4 text-[14.5px] font-bold text-white shadow-elev transition-colors hover:bg-[#1FAF57] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="whatsapp" className="icon !h-[17px] !w-[17px]" />
          Open in WhatsApp
        </button>
      </div>
    </>
  )
}
