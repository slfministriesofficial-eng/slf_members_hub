/**
 * Small circular alert-count badge (gold with dark text, gently pulsing).
 * Renders nothing when the count is zero, shows "9+" past nine. Positioning
 * (corner overlay vs inline) is the caller's job via className.
 */
export function CountBadge({ count, className = '' }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={`motion-safe:animate-[pulse-soft_2.5s_ease-in-out_infinite] flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brass px-1 text-[9px] font-bold leading-none text-ink-deep ${className}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}
