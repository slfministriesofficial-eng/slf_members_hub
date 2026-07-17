/**
 * Standard on/off switch — navy track when on, muted track when off.
 * @param {{checked: boolean, onChange: (next: boolean) => void, disabled?: boolean, label: string}} props
 *   label is for screen readers only (the visible context sits next to the switch)
 */
export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-ink' : 'bg-paper-2 ring-1 ring-inset ring-hairline'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-card transition-[left] duration-200 ${
          checked ? 'left-[26px]' : 'left-1'
        }`}
      />
    </button>
  )
}
