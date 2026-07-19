import { Icon } from './Icon'

/**
 * The primary per-page action pill shown at the top-right of a page (Add
 * Member, Schedule, …). One consistent, gently animated design everywhere:
 * a drifting brass gradient (subtle shimmer), lift-on-hover, and press-in on
 * tap. Replaces the old circle-icon + plain-text treatment.
 */
export function TopAction({
  icon,
  label,
  onClick,
  className = '',
}: {
  icon: string
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`motion-safe:animate-[gradient-drift_5s_ease_infinite] flex shrink-0 items-center gap-1.5 rounded-full bg-[length:300%_300%] bg-gradient-to-r from-brass via-[#E4C57E] to-brass-deep px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_8px_16px_rgba(184,134,58,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-[0_12px_22px_rgba(184,134,58,0.45)] active:scale-95 ${className}`}
    >
      <Icon name={icon} className="icon !h-[15px] !w-[15px] text-white" />
      {label}
    </button>
  )
}
