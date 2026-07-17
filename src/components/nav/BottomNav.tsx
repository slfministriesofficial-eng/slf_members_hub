import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { CountBadge } from '../ui/CountBadge'
import { useAlertCounts, badgeForRoute } from '../../hooks/useAlertCounts'

// Bottom bar keeps only the most-frequent five; everything else (Announcements,
// Birthdays, Membership Cards, Reports, Settings, Logout, …) lives in the NavDrawer,
// which "More" opens instead of navigating anywhere itself.
const TABS = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/members', label: 'Members', icon: 'users' },
  { to: '/attendance', label: 'Attend.', icon: 'cal-check' },
  { to: '/follow-ups', label: 'Follow', icon: 'flag' },
]

type BottomNavProps = {
  onMoreClick: () => void
  isMoreActive: boolean
}

export function BottomNav({ onMoreClick, isMoreActive }: BottomNavProps) {
  const counts = useAlertCounts()
  // Anything alert-worthy that lives behind the drawer (e.g. today's
  // birthdays) surfaces on the More tab so it isn't invisible on mobile.
  const moreBadge = counts.celebrationsToday

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex h-16 items-center justify-around rounded-[22px] bg-surface/95 shadow-[0_10px_24px_rgba(34,38,43,0.16)] backdrop-blur-sm mx-auto max-w-md md:hidden print:hidden">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex w-14 flex-col items-center gap-1 ${isActive ? 'text-heading' : 'text-faint'}`
          }
        >
          <span className="relative">
            <Icon name={tab.icon} className="icon !h-5 !w-5" />
            <CountBadge count={badgeForRoute(counts, tab.to)} className="absolute -right-2.5 -top-1.5" />
          </span>
          <span className="text-[9.5px] font-bold font-body">{tab.label}</span>
        </NavLink>
      ))}
      <button
        onClick={onMoreClick}
        aria-label="Open menu"
        className={`flex w-14 flex-col items-center gap-1 ${isMoreActive ? 'text-heading' : 'text-faint'}`}
      >
        <span className="relative">
          <Icon name="grid" className="icon !h-5 !w-5" />
          <CountBadge count={moreBadge} className="absolute -right-2.5 -top-1.5" />
        </span>
        <span className="text-[9.5px] font-bold font-body">More</span>
      </button>
    </nav>
  )
}
