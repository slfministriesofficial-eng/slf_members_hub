import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import type { Member } from '../../mock/types'

type DeleteMemberModalProps = {
  member: Member
  onCancel: () => void
  onConfirm: (reason: string) => void
}

// Shared by the Members directory and the Member Profile page so "remove a
// member" behaves identically everywhere — confirm, optional reason, and (if
// a reason is given) an automatic WhatsApp notice to that member.
export function DeleteMemberModal({ member, onCancel, onConfirm }: DeleteMemberModalProps) {
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
            <h3 className="font-display text-[16.5px] font-bold text-heading">Remove Member?</h3>
            <p className="text-[12px] text-slate">This can't be undone.</p>
          </div>
        </div>

        <p className="mb-3 text-[13px] text-charcoal">
          Remove <b className="font-semibold text-heading">{member.name}</b> from the member list?
        </p>

        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
            Reason (optional)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Moved to another church"
            rows={3}
            className="w-full resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[13px] text-heading outline-none transition-colors focus:border-ink"
          />
        </label>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate">
          <Icon name="chat" className="icon !h-[12px] !w-[12px] shrink-0" />
          If you write a reason, it's sent to {member.name.split(' ')[0]}'s WhatsApp automatically.
        </p>

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
            Remove Member
          </button>
        </div>
      </div>
    </div>
  )
}
