import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

type ConfirmRemoveModalProps = {
  /** Bold heading, e.g. "Remove Member?" / "Revoke Access?" */
  title: string
  /** Small line under the heading, e.g. "This can't be undone." */
  subtitle?: string
  /** The main sentence — supports bold names via JSX. */
  body: ReactNode
  /** First name for the WhatsApp note; when set, the optional reason is sent
   *  to this person's WhatsApp on confirm. Omit to hide the note. */
  firstName?: string
  reasonPlaceholder?: string
  /** Confirm button label, e.g. "Remove Member" / "Revoke Access". */
  confirmLabel: string
  onCancel: () => void
  onConfirm: (reason: string) => void
}

/**
 * Shared "confirm a destructive action, with an optional reason that's sent to
 * the person's WhatsApp" modal. Used for removing a member and revoking an
 * attendance taker so both behave and look identical.
 */
export function ConfirmRemoveModal({
  title,
  subtitle,
  body,
  firstName,
  reasonPlaceholder,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmRemoveModalProps) {
  const [reason, setReason] = useState('')

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
        className="motion-safe:animate-[scale-in_0.25s_ease-out_both] w-full max-w-[420px] rounded-[26px] bg-surface p-5 shadow-elev"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-status-alert-bg">
            <Icon name="trash" className="icon !h-[19px] !w-[19px] text-status-alert-fg" />
          </span>
          <div>
            <h3 className="font-display text-[16.5px] font-bold text-heading">{title}</h3>
            {subtitle && <p className="text-[12px] text-slate">{subtitle}</p>}
          </div>
        </div>

        <p className="mb-3 text-[13px] text-charcoal">{body}</p>

        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
            Reason (optional)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            rows={3}
            className="w-full resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[13px] text-heading outline-none transition-colors focus:border-ink"
          />
        </label>
        {firstName && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate">
            <Icon name="chat" className="icon !h-[12px] !w-[12px] shrink-0" />
            If you write a reason, it's sent to {firstName}'s WhatsApp automatically.
          </p>
        )}

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-hairline bg-surface py-3 text-[13px] font-bold text-heading transition-colors hover:bg-paper"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 rounded-xl bg-[#B1503F] py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#96412F]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
