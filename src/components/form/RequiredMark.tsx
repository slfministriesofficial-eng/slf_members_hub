/**
 * The red asterisk on a mandatory field's label.
 *
 * Deliberately larger than the 11.5px label it sits in — at label size it was
 * easy to miss, and these are the fields the wizard will not let you past.
 * `leading-none` plus `align-middle` keep the bigger glyph from stretching the
 * label's line height.
 */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 align-middle text-[16px] font-bold leading-none text-status-alert-fg">
      *
    </span>
  )
}
