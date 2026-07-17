import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { CountBadge } from '../ui/CountBadge'
import { useAlertCounts, badgeForRoute } from '../../hooks/useAlertCounts'
import logo from '../../assets/slf_logo_cropped.png'

// Single source of truth for the app's navigation — the mobile NavDrawer
// renders these same lists so both surfaces always stay identical.
export const LINKS = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/members', label: 'Members', icon: 'users', end: false },
  { to: '/attendance', label: 'Attendance', icon: 'cal-check', end: false },
  { to: '/follow-ups', label: 'Follow-ups', icon: 'flag', end: false },
  { to: '/birthdays', label: 'Birthdays & Anniversaries', icon: 'cake', end: false },
  { to: '/announcements', label: 'Announcements', icon: 'megaphone', end: false },
  { to: '/membership-cards', label: 'Membership Cards', icon: 'id', end: false },
]

export const SYSTEM_LINKS = [
  { to: '/reports', label: 'Reports', icon: 'chart', end: false },
  { to: '/access', label: 'Access Settings', icon: 'shield', end: false },
  { to: '/more', label: 'More', icon: 'grid', end: false },
]

export function NavItem({
  to,
  label,
  icon,
  end,
  onClick,
  badge = 0,
}: {
  to: string
  label: string
  icon: string
  end: boolean
  onClick?: () => void
  badge?: number
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
          isActive ? 'bg-brass/15 text-brass' : 'text-[#CFDDD3] hover:text-white'
        }`
      }
    >
      <Icon name={icon} className="icon !h-[17px] !w-[17px] shrink-0" />
      <span className="min-w-0 flex-1">{label}</span>
      <CountBadge count={badge} />
    </NavLink>
  )
}

// Desktop/web only — mobile keeps the bottom tab bar untouched.
export function Sidebar() {
  const counts = useAlertCounts()

  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-56 md:shrink-0 md:flex-col md:overflow-y-auto md:bg-ink-deep md:px-4 md:py-6 print:hidden">
      <div className="mb-8 flex items-center gap-2.5 px-2 text-white">
        <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-brass/70">
          <img src={logo} alt="" className="h-full w-full object-cover" />
        </span>
        <span className="font-display text-[15px] font-bold leading-tight">SLF Members Hub</span>
      </div>

      <nav className="flex flex-col gap-1">
        {LINKS.map((link) => (
          <NavItem key={link.to} {...link} badge={badgeForRoute(counts, link.to)} />
        ))}
      </nav>

      <div className="mt-6 mb-2 px-3 text-[10.5px] font-bold uppercase tracking-wide text-[#7C8AA0]">
        System
      </div>
      <nav className="flex flex-col gap-1">
        {SYSTEM_LINKS.map((link) => (
          <NavItem key={link.to} {...link} badge={badgeForRoute(counts, link.to)} />
        ))}
      </nav>
    </aside>
  )
}
