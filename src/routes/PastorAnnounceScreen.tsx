import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { Toast } from '../components/ui/Toast'
import { usePastors } from '../features/pastors/PastorsContext'
import { PastorSendList } from '../features/pastors/PastorSendList'
import type { Pastor } from '../features/pastors/types'
import { openWhatsappBroadcast } from '../templates/whatsapp'
import {
  buildWhatsappAnnouncement,
  FIELD_CLASS,
  LABEL_CLASS,
  MAX_MESSAGE_LENGTH,
  messageValidationError,
  StepSection,
  type LinkEntry,
} from '../features/announcements/shared'

const ACCENT = 'bg-[#25D366]' // WhatsApp green, same identity as the member composer

type Audience = 'all' | 'Approved' | 'Pending'

const AUDIENCES: { key: Audience; label: string }[] = [
  { key: 'all', label: 'Everyone' },
  { key: 'Approved', label: 'Approved only' },
  { key: 'Pending', label: 'Pending only' },
]

function statusOf(pastor: Pastor): string {
  return pastor.status === 'Verified' || pastor.status === 'Approved' ? pastor.status : 'Pending'
}

/**
 * "Message Pastors" — compose one announcement for the fellowship, then send it
 * from the list below, one pastor at a time.
 *
 * Pastors-only by design: this never touches the member notification list, so
 * a fellowship meeting notice can't accidentally go to the whole church.
 */
export function PastorAnnounceScreen() {
  const navigate = useNavigate()
  const { pastors, isError } = usePastors()
  const [audience, setAudience] = useState<Audience>('all')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  // Some fellowship messages genuinely have no "when" — a prayer request, a
  // general notice. The member composer exempts its emergency template the
  // same way; this is the free-form equivalent.
  const [noDateTime, setNoDateTime] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  // Owned here rather than inside the list: the list unmounts whenever the
  // message is edited back to empty, which used to wipe the record of who had
  // already been messaged part-way through a send.
  const [sent, setSent] = useState<Set<string>>(new Set())
  const markSent = useCallback((memberId: string) => {
    setSent((prev) => new Set(prev).add(memberId))
  }, [])

  const links: LinkEntry[] = link.trim() ? [{ label: 'Link', url: link }] : []
  const preview = buildWhatsappAnnouncement(title, message, links)
  const hasMessage = message.trim().length > 0
  // Same check the member WhatsApp broadcast runs: unreplaced [placeholders],
  // and a missing date/time unless this message is marked as having none.
  const validationError = hasMessage ? messageValidationError(preview, !noDateTime) : null
  const canSend = hasMessage && !validationError

  const recipients = useMemo(
    () =>
      pastors.filter((p) => {
        if (audience === 'all') return true
        // "Approved only" covers Verified too — both are past the Pending stage.
        if (audience === 'Approved') return statusOf(p) !== 'Pending'
        return statusOf(p) === 'Pending'
      }),
    [pastors, audience],
  )

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="Message Pastors" onBack={() => navigate('/pastors')} />
      <p className="mb-5 text-[12.5px] text-slate">
        Write one message for the fellowship, then send it on WhatsApp to each pastor below.
      </p>

      {isError && (
        <div className="mb-4 rounded-2xl bg-surface px-6 py-10 text-center shadow-card">
          <p className="text-[13.5px] font-bold text-heading">Could not load the pastors register</p>
          <p className="mx-auto mt-1 max-w-[340px] text-[12px] text-slate">
            You can still compose a message, but there is no one to send it to until this loads. Check
            your connection, and make sure the latest Apps Script version is deployed.
          </p>
        </div>
      )}

      {toast && <Toast message={toast} tone="error" onDismiss={() => setToast(null)} />}

      <div className="flex flex-col gap-4">
        <StepSection step={1} title="Who it goes to" accent={ACCENT}>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => {
              const count = pastors.filter((p) =>
                a.key === 'all' ? true : a.key === 'Approved' ? statusOf(p) !== 'Pending' : statusOf(p) === 'Pending',
              ).length
              return (
                <button
                  key={a.key}
                  onClick={() => setAudience(a.key)}
                  className={`rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
                    audience === a.key ? 'bg-ink text-white' : 'bg-surface text-heading shadow-card'
                  }`}
                >
                  {a.label} · {count}
                </button>
              )
            })}
          </div>
        </StepSection>

        <StepSection step={2} title="Write the message" accent={ACCENT}>
          <label className={LABEL_CLASS}>Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pastors Fellowship Meeting"
            className={`${FIELD_CLASS} mb-3.5`}
          />
          <label className={LABEL_CLASS}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
            rows={5}
            placeholder="Our next fellowship meeting is on Saturday, 4 Oct at 10:00 AM at SLF Ministries, Tadigadapa."
            className={`${FIELD_CLASS} mb-1 resize-none`}
          />
          <div className="mb-3.5 text-right text-[11px] text-slate">
            {message.length}/{MAX_MESSAGE_LENGTH}
          </div>
          <label className={LABEL_CLASS}>Link (optional)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
            className={FIELD_CLASS}
          />

          <label className="mt-3.5 flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={noDateTime}
              onChange={(e) => setNoDateTime(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
            />
            <span className="text-[12px] leading-relaxed text-slate">
              This message has no date or time (a prayer request or general notice)
            </span>
          </label>

          {validationError && (
            <p className="mt-3 rounded-xl bg-status-alert-bg px-3.5 py-2.5 text-[12px] font-semibold text-status-alert-fg">
              {validationError}
            </p>
          )}
        </StepSection>

        <StepSection step={3} title="Preview" hint="Exactly what each pastor receives" accent={ACCENT}>
          <div className="rounded-2xl bg-[#E7F7E1] p-3.5 dark:bg-[#1F3A2B]">
            <pre className="whitespace-pre-wrap break-words font-body text-[13px] leading-relaxed text-charcoal">
              {preview}
            </pre>
          </div>
          <button
            onClick={() => (canSend ? openWhatsappBroadcast(preview) : setToast(validationError))}
            disabled={!hasMessage}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-surface py-3 text-[13px] font-bold text-heading disabled:opacity-40"
          >
            <Icon name="whatsapp" className="icon !h-[15px] !w-[15px] text-[#25D366]" />
            Open WhatsApp to pick a group or broadcast list
          </button>
        </StepSection>

        <StepSection
          step={4}
          title={`Send to each pastor · ${recipients.length}`}
          hint="Opens WhatsApp with the message ready — you press send there"
          accent={ACCENT}
        >
          {canSend ? (
            <PastorSendList
              pastors={recipients}
              messageFor={() => preview}
              sent={sent}
              onSent={markSent}
              emptyLabel="No pastors match this audience."
            />
          ) : (
            <p className="py-6 text-center text-[12.5px] text-slate">
              {validationError ?? 'Write a message above to start sending.'}
            </p>
          )}
        </StepSection>
      </div>
    </div>
  )
}
