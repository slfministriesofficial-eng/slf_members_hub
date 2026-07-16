import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import { normalizeWhatsappNumber } from './whatsapp'
import type { Member } from '../../mock/types'

type SendWishModalProps<TKey extends string> = {
  member: Member
  icon: string
  title: string
  templates: { key: TKey; label: string }[]
  buildMessage: (key: TKey, member: Member) => string
  onCancel: () => void
  onSend: (message: string, number: string) => void
}

// Shared by every "send a WhatsApp wish/message" flow (birthdays,
// anniversaries, new-member welcome) — template chips, an editable live
// preview, and Copy/Open WhatsApp actions. Sending always uses exactly
// what's in the preview textarea, so a hand edit is never silently discarded.
export function SendWishModal<TKey extends string>({
  member,
  icon,
  title,
  templates,
  buildMessage,
  onCancel,
  onSend,
}: SendWishModalProps<TKey>) {
  const [templateKey, setTemplateKey] = useState<TKey | 'custom'>(templates[0].key)
  const [message, setMessage] = useState(() => buildMessage(templates[0].key, member))
  const [number, setNumber] = useState(member.whatsapp || '')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  function pickTemplate(key: TKey) {
    setTemplateKey(key)
    setMessage(buildMessage(key, member))
  }

  const validNumber = normalizeWhatsappNumber(number)

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message)
    } catch {
      // clipboard permission denied — nothing more we can do here
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4"
      onClick={onCancel}
    >
      <div
        className="motion-safe:animate-[fade-rise_0.3s_ease-out_both] max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-surface p-5 shadow-elev md:max-w-[440px] md:rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
            <Icon name={icon} className="icon !h-[19px] !w-[19px] text-[#1FAF57]" />
          </span>
          <div>
            <h3 className="font-display text-[16.5px] font-bold text-heading">{title}</h3>
            <p className="text-[12px] text-slate">For {member.name}</p>
          </div>
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate">
            WhatsApp Number
          </span>
          <input
            type="tel"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="90000 12345"
            className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-2.5 text-[13.5px] text-heading outline-none focus:border-ink"
          />
        </label>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {templates.map((t) => (
            <button
              key={t.key}
              onClick={() => pickTemplate(t.key)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[11.5px] font-bold transition-colors ${
                templateKey === t.key ? 'bg-ink-deep text-white' : 'bg-paper text-heading hover:bg-paper-2'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setTemplateKey('custom')}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[11.5px] font-bold transition-colors ${
              templateKey === 'custom' ? 'bg-ink-deep text-white' : 'bg-paper text-heading hover:bg-paper-2'
            }`}
          >
            Custom Message
          </button>
        </div>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate">
            Message Preview
          </span>
          <textarea
            value={message}
            onChange={(e) => {
              setTemplateKey('custom')
              setMessage(e.target.value)
            }}
            rows={7}
            className="w-full resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[12.5px] leading-relaxed text-heading outline-none focus:border-ink"
          />
        </label>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-hairline bg-surface py-3 text-[13px] font-bold text-heading transition-colors hover:bg-paper"
          >
            Cancel
          </button>
          <button
            onClick={copyMessage}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-paper-2 py-3 text-[13px] font-bold text-heading transition-colors hover:bg-paper"
          >
            <Icon name="copy" className="icon !h-[14px] !w-[14px]" />
            Copy Message
          </button>
          <button
            onClick={() => validNumber && onSend(message, validNumber)}
            disabled={!validNumber}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#1FAF57] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="chat" className="icon !h-[14px] !w-[14px]" />
            Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
