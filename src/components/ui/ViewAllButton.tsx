import { Icon } from './Icon'

/**
 * The single "View all" affordance used across every list preview — one
 * consistent, borderless pill (brass text + chevron, soft hover fill) so the
 * action reads the same everywhere and is quick to tap.
 */
export function ViewAllButton({ onClick, label = 'View all' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-0.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold text-brass-deep transition-colors hover:bg-brass/10 active:scale-95"
    >
      {label}
      <Icon name="chevron" className="icon !h-[12px] !w-[12px]" />
    </button>
  )
}
