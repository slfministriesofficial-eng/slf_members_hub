import { useEffect, useState } from 'react'
import { Icon } from '../../components/ui/Icon'
import type { Member } from '../../mock/types'
import { normalizeWhatsappNumber } from '../../templates/whatsapp'

type AddWhatsappModalProps = {
  member: Member
  onCancel: () => void
  onSave: (rawNumber: string) => void
  saving: boolean
}

// Quick add-on-the-spot flow for members whose sheet record has no WhatsApp
// number yet — saves straight to their existing record via a partial update
// (Code.gs merges provided fields into the existing row, leaving everything
// else untouched), no need to route through the full edit-member form.
export function AddWhatsappModal({ member, onCancel, onSave, saving }: AddWhatsappModalProps) {
  const [value, setValue] = useState('')
  const normalized = normalizeWhatsappNumber(value)
  const canSave = Boolean(normalized) && !saving

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
        className="motion-safe:animate-[scale-in_0.25s_ease-out_both] w-full max-w-[400px] rounded-[26px] bg-surface p-5 shadow-elev"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
            <Icon name="chat" className="icon !h-[19px] !w-[19px] text-[#1FAF57]" />
          </span>
          <div>
            <h3 className="font-display text-[16.5px] font-bold text-heading">Add WhatsApp Number</h3>
            <p className="text-[12px] text-slate">For {member.name}</p>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">
            WhatsApp Number
          </span>
          <input
            type="tel"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 90000 12345"
            className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate focus:border-ink"
          />
        </label>
        <p className="mt-1.5 text-[11px] text-slate">Saved directly to this member's record in the sheet.</p>

        <div className="mt-4 flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-xl border border-hairline bg-surface py-3 text-[13px] font-bold text-heading transition-colors hover:bg-paper disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => canSave && onSave(value.trim())}
            disabled={!canSave}
            className="flex-1 rounded-xl bg-[#25D366] py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#1FAF57] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Number'}
          </button>
        </div>
      </div>
    </div>
  )
}
