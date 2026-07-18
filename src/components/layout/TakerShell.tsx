import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { useAuth } from '../../auth/AuthContext'
import logo from '../../assets/slf_logo_cropped.png'

// The attendance taker's world is exactly two screens — a deliberately tiny
// shell so a volunteer never sees (or bumps into) admin surfaces. Everything
// else is redirected to /attendance by the router.
const TAKER_LINKS = [
  { to: '/attendance', label: 'Attendance', icon: 'cal-check' },
  { to: '/members/new', label: 'Add Member', icon: 'plus' },
]

/**
 * Minimal layout for the attendance-taker role: a slim branded header with a
 * sign-out, the active screen, and a two-item bottom bar. Reuses none of the
 * admin Sidebar/BottomNav so there's nothing to lock down.
 */
export function TakerShell() {
  const navigate = useNavigate()
  const { takerEmail, logout } = useAuth()

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-hairline bg-surface px-4 py-3 shadow-card">
        <span className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-brass/70">
          <img src={logo} alt="" className="h-full w-full object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[14px] font-bold leading-tight text-heading">
            Attendance
          </div>
          {takerEmail && <div className="truncate text-[10.5px] text-slate">{takerEmail}</div>}
        </div>
        <button
          onClick={() => {
            logout()
            navigate('/', { replace: true })
          }}
          className="flex items-center gap-1.5 rounded-full bg-paper-2 px-3 py-1.5 text-[11.5px] font-bold text-slate transition-colors hover:text-heading"
        >
          <Icon name="logout" className="icon !h-[13px] !w-[13px]" />
          Sign out
        </button>
      </header>

      <main className="mx-auto max-w-md px-4 pb-28 pt-5">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] shadow-elev">
        {TAKER_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors ${
                isActive ? 'text-brass-deep' : 'text-slate'
              }`
            }
          >
            <Icon name={link.icon} className="icon !h-[19px] !w-[19px]" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
