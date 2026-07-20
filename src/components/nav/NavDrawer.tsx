import { useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { CountBadge } from '../ui/CountBadge'
import { AdminProfileCard } from '../ui/AdminProfileCard'
import { useAuth } from '../../auth/AuthContext'
import { useAlertCounts, badgeForRoute } from '../../hooks/useAlertCounts'
import logo from '../../assets/slf_logo_cropped.png'

type NavDrawerProps = {
  open: boolean
  onClose: () => void
}

type DrawerLink = { to: string; label: string; icon: string; end?: boolean }

// Grouped like a real app menu — each section is its own card. Uses theme
// tokens (surface/paper/heading), so it's white in light mode and dark in
// dark mode automatically.
const SECTIONS: { title: string; items: DrawerLink[] }[] = [
  { title: 'Overview', items: [{ to: '/', label: 'Dashboard', icon: 'home', end: true }] },
  {
    title: 'Members & Care',
    items: [
      { to: '/members', label: 'Members', icon: 'users' },
      { to: '/attendance', label: 'Attendance', icon: 'cal-check' },
      { to: '/follow-ups', label: 'Follow-ups', icon: 'flag' },
      { to: '/birthdays', label: 'Birthdays & Anniversaries', icon: 'cake' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { to: '/announcements', label: 'Announcements', icon: 'megaphone' },
      { to: '/membership-cards', label: 'Membership Cards', icon: 'id' },
    ],
  },
  {
    title: 'Insights & System',
    items: [
      { to: '/reports', label: 'Reports & Analytics', icon: 'chart' },
      { to: '/registration-forms', label: 'Registration Forms', icon: 'note' },
      { to: '/access', label: 'Access Settings', icon: 'shield' },
      { to: '/more', label: 'More', icon: 'grid' },
    ],
  },
]

/**
 * Mobile slide-out menu, redesigned as a grouped, card-based sidebar (theme
 * aware). Top shows the church logo, name and a "View Profile" link to the
 * admin's profile; sections below hold the real navigation; logout sits at the
 * bottom.
 */
export function NavDrawer({ open, onClose }: NavDrawerProps) {
  const { adminName, logout } = useAuth()
  const navigate = useNavigate()
  const counts = useAlertCounts()
  const name = adminName || 'Admin'

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

  return (
    <div className={`fixed inset-0 z-[60] md:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />

      <aside
        className={`absolute inset-y-0 left-0 flex w-full flex-col overflow-y-auto bg-paper shadow-elev transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header — logo, church name, View Profile link */}
        <div className="sticky top-0 z-10 border-b border-hairline bg-surface px-4 pb-3.5 pt-5">
          <div className="flex items-start gap-3.5">
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-brass/70 shadow-card">
              <img src={logo} alt="" className="h-full w-full object-cover" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <div className="font-display text-[20px] font-bold leading-tight text-heading">SLF Members Hub</div>
              <button
                onClick={() => {
                  onClose()
                  navigate('/profile')
                }}
                className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-brass-deep"
              >
                View Profile
                <Icon name="chevron" className="icon !h-[11px] !w-[11px]" />
              </button>
            </div>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate hover:bg-paper-2 hover:text-heading"
            >
              <Icon name="x" className="icon !h-[16px] !w-[16px]" />
            </button>
          </div>
        </div>

        <div className="flex-1 px-3.5 py-4">
          {/* Signed-in admin — tap to open the full profile. */}
          <div className="mb-4">
            <AdminProfileCard onNavigate={onClose} />
          </div>

          {SECTIONS.map((section) => (
            <div key={section.title} className="mb-4">
              <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-slate">
                {section.title}
              </div>
              <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
                {section.items.map((item, i) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-3 ${i < section.items.length - 1 ? 'border-b border-hairline' : ''} ${
                        isActive ? 'bg-brass/10' : ''
                      }`
                    }
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-paper-2">
                      <Icon name={item.icon} className="icon !h-[15px] !w-[15px] text-brass-deep" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-charcoal">
                      {item.label}
                    </span>
                    <CountBadge count={badgeForRoute(counts, item.to)} />
                    <Icon name="chevron" className="icon !h-[14px] !w-[14px] shrink-0 text-faint" />
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Account */}
          <div className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wide text-slate">Account</div>
          <div className="overflow-hidden rounded-2xl bg-surface shadow-card">
            <button
              onClick={() => {
                onClose()
                logout()
              }}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-status-alert-bg">
                <Icon name="logout" className="icon !h-[15px] !w-[15px] text-status-alert-fg" />
              </span>
              <span className="flex-1 text-[13px] font-semibold text-status-alert-fg">Log out</span>
              <span className="text-[11px] text-faint">{name}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
