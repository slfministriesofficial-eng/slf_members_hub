import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { useAuth } from '../../auth/AuthContext'
import logo from '../../assets/logo.jpeg'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/members', label: 'Members', icon: 'users', end: false },
  { to: '/attendance', label: 'Attendance', icon: 'cal-check', end: false },
  { to: '/follow-ups', label: 'Follow-ups', icon: 'flag', end: false },
  { to: '/announcements', label: 'Announcements', icon: 'megaphone', end: false },
  { to: '/birthdays', label: 'Birthdays', icon: 'cake', end: false },
  { to: '/membership-cards', label: 'Membership Cards', icon: 'id', end: false },
  { to: '/reports', label: 'Reports', icon: 'chart', end: false },
]

// Export/Backup have no wiring anywhere in the app yet (same placeholder
// state as their entries on Home/More) — inert here too, not a regression.
const PLACEHOLDER_ITEMS = [
  { label: 'Export', icon: 'download' },
  { label: 'Backup', icon: 'cloud' },
]

const SETTINGS_ITEMS = [
  { to: '/more', label: 'Settings', icon: 'grid', end: false },
  { to: '/access', label: 'Access Settings', icon: 'shield', end: false },
]

type NavDrawerProps = {
  open: boolean
  onClose: () => void
}

// Mobile-only slide-out drawer — desktop keeps the persistent Sidebar instead.
// Mirrors the Sidebar's dark navy + gold styling so the two feel like one system.
export function NavDrawer({ open, onClose }: NavDrawerProps) {
  const { logout } = useAuth()

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-3 text-[13.5px] font-semibold transition-colors ${
      isActive ? 'bg-brass/15 text-brass' : 'text-[#CFDDD3] hover:bg-white/5 hover:text-white'
    }`

  return (
    <div className={`fixed inset-0 z-[60] md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        className={`absolute inset-y-0 left-0 flex w-[280px] max-w-[82%] flex-col overflow-y-auto bg-ink-deep px-4 py-6 shadow-elev transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-6 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5 text-white">
            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-brass/70">
              <img src={logo} alt="" className="h-full w-full scale-[1.9] object-cover" />
            </span>
            <span className="font-display text-[15px] font-bold leading-tight">SLF Members Hub</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#CFDDD3] hover:bg-white/10 hover:text-white"
          >
            <Icon name="x" className="icon !h-[16px] !w-[16px]" />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose} className={linkClass}>
              <Icon name={item.icon} className="icon !h-[18px] !w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 mb-2 px-3 text-[10.5px] font-bold uppercase tracking-wide text-[#7C8AA0]">
          More
        </div>
        <nav className="flex flex-col gap-1">
          {PLACEHOLDER_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-[13.5px] font-semibold text-[#7C8AA0]"
            >
              <Icon name={item.icon} className="icon !h-[18px] !w-[18px]" />
              {item.label}
            </div>
          ))}
          {SETTINGS_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose} className={linkClass}>
              <Icon name={item.icon} className="icon !h-[18px] !w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-3">
          <button
            onClick={() => {
              onClose()
              logout()
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-[13.5px] font-semibold text-status-alert-fg hover:bg-status-alert-bg/10"
          >
            <Icon name="logout" className="icon !h-[18px] !w-[18px]" />
            Logout
          </button>
        </div>
      </aside>
    </div>
  )
}
