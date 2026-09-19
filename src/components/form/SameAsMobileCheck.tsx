/**
 * "Same as mobile" tick that sits beside the WhatsApp field's label.
 *
 * Most people register one number for both, and re-typing it was both extra
 * work and a chance to fat-finger a digit. While ticked, the WhatsApp box
 * mirrors the mobile number and is read-only, so the two can never drift.
 *
 * @param {{checked: boolean, onChange: (next: boolean) => void}} props
 */
export function SameAsMobileCheck({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    // A button, not a nested <label> — this renders inside the field's own
    // label, and a checkbox in there would toggle on every click of the input.
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex shrink-0 items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate transition-colors hover:text-heading"
    >
      <span
        className={`flex h-[15px] w-[15px] items-center justify-center rounded-[5px] border transition-colors ${
          checked ? 'border-ink bg-ink' : 'border-hairline bg-paper'
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-[9px] w-[9px]" aria-hidden="true">
            <path
              d="M2 6.2l2.6 2.6L10 3.4"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      Same as mobile
    </button>
  )
}
