import { useNavigate } from 'react-router-dom'
import { Icon } from './Icon'

/**
 * Mobile-only "‹" back button, placed at the start of a primary page's title
 * row. Desktop navigates via the sidebar, so this is hidden there. Defaults to
 * the dashboard — the natural "up" for a top-level page reached from the nav.
 */
export function MobileBackButton({ to = '/' }: { to?: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(to)}
      aria-label="Back"
      className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:text-heading md:hidden"
    >
      <Icon name="chevron" className="icon !h-[18px] !w-[18px] rotate-180" />
    </button>
  )
}
