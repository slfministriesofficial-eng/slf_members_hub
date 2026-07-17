import { useEffect } from 'react'
import { Icon } from '../ui/Icon'
import { useAuth } from '../../auth/AuthContext'
import { useAlertCounts, badgeForRoute } from '../../hooks/useAlertCounts'
import { LINKS, SYSTEM_LINKS, NavItem } from './Sidebar'
import logo from '../../assets/slf_logo_cropped.png'

type NavDrawerProps = {
  open: boolean
  onClose: () => void
}

// Mobile-only slide-out drawer — renders the exact same LINKS / SYSTEM
// sections (and the same NavItem styling, active highlight included) as the
// desktop Sidebar, so the two surfaces are always identical. The only
// mobile-specific extras are the close button and the Logout row (desktop
// reaches logout via the top bar instead).
export function NavDrawer({ open, onClose }: NavDrawerProps) {
  const { logout } = useAuth()
  const counts = useAlertCounts()

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
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        className={`absolute inset-y-0 left-0 flex w-[280px] max-w-[82%] flex-col overflow-y-auto bg-ink-deep px-4 py-6 shadow-elev transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between px-1">
          <div className="flex items-center gap-2.5 text-white">
            <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-brass/70">
              <img src={logo} alt="" className="h-full w-full object-cover" />
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
          {LINKS.map((link) => (
            <NavItem key={link.to} {...link} onClick={onClose} badge={badgeForRoute(counts, link.to)} />
          ))}
        </nav>

        <div className="mt-6 mb-2 px-3 text-[10.5px] font-bold uppercase tracking-wide text-[#7C8AA0]">
          System
        </div>
        <nav className="flex flex-col gap-1">
          {SYSTEM_LINKS.map((link) => (
            <NavItem key={link.to} {...link} onClick={onClose} badge={badgeForRoute(counts, link.to)} />
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-3">
          <button
            onClick={() => {
              onClose()
              logout()
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-status-alert-fg hover:bg-status-alert-bg/10"
          >
            <Icon name="logout" className="icon !h-[17px] !w-[17px]" />
            Logout
          </button>
        </div>
      </aside>
    </div>
  )
}
