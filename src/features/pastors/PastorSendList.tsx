import { useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { Avatar } from '../../components/ui/Avatar'
import { normalizeWhatsappNumber, openWhatsappWithText } from '../../templates/whatsapp'
import type { Pastor } from './types'

/**
 * The send half of every pastor WhatsApp flow: one row per pastor with its own
 * Send button, ticked off as you go.
 *
 * There is no bulk auto-send here, on purpose — the same rule the member
 * announcement composer follows. Real bulk sending needs the WhatsApp Business
 * API, which this app deliberately avoids, so each message is opened in
 * WhatsApp and sent by hand.
 *
 * @param {{pastors: Pastor[], messageFor: (p: Pastor) => string, emptyLabel?: string}} props
 *   the recipients, and how to build each one's message
 */
export function PastorSendList({
  pastors,
  messageFor,
  emptyLabel = 'No pastors to message yet.',
}: {
  pastors: Pastor[]
  messageFor: (pastor: Pastor) => string
  emptyLabel?: string
}) {
  const [sent, setSent] = useState<Set<string>>(new Set())

  function send(pastor: Pastor) {
    const number = normalizeWhatsappNumber(pastor.whatsapp || pastor.mobile)
    if (!number) return
    openWhatsappWithText(number, messageFor(pastor))
    setSent((prev) => new Set(prev).add(pastor.memberId))
  }

  if (pastors.length === 0) {
    return <p className="py-8 text-center text-[12.5px] text-slate">{emptyLabel}</p>
  }

  return (
    <div className="rounded-2xl bg-surface px-3.5 shadow-card">
      {pastors.map((pastor) => {
        const number = normalizeWhatsappNumber(pastor.whatsapp || pastor.mobile)
        const isSent = sent.has(pastor.memberId)
        return (
          <div
            key={pastor.memberId}
            className="flex items-center gap-2.5 border-b border-hairline py-2.5 last:border-0"
          >
            <Avatar initials={pastor.initials} color={pastor.color} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-heading">{pastor.fullName}</div>
              <div className="truncate text-[11px] text-slate">
                {number ? pastor.whatsapp || pastor.mobile : 'No WhatsApp number on file'}
              </div>
            </div>
            <button
              onClick={() => send(pastor)}
              disabled={!number}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-bold transition-transform disabled:opacity-40 ${
                isSent
                  ? 'bg-status-regular-bg text-status-regular-fg'
                  : 'bg-[#25D366] text-white hover:scale-105'
              }`}
            >
              <Icon name={isSent ? 'check' : 'whatsapp'} className="icon !h-[13px] !w-[13px]" />
              {isSent ? 'Sent' : 'Send'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
