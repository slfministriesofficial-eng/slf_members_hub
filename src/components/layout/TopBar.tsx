import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ADMIN_ROLE, useAuth } from '../../auth/AuthContext'
import { getInitials } from '../../utils/initials'
import { getFormattedDate } from '../../utils/date'
import { Icon } from '../ui/Icon'
import { NotificationBell } from '../../notifications/NotificationBell'

export function TopBar() {
  const { adminName, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isDashboard = pathname === '/'
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const name = adminName || 'Admin'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  return (
    <div className="mb-6 hidden items-center justify-between md:flex print:hidden">
      <div className="text-[13px] font-semibold text-slate">{getFormattedDate()}</div>

      <div className="flex items-center gap-2.5">
        {isDashboard && (
          <button
            onClick={() => navigate('/members/new')}
            className="motion-safe:animate-[gradient-drift_5s_ease_infinite] flex items-center gap-1.5 rounded-full bg-[length:300%_300%] bg-gradient-to-r from-brass via-[#E4C57E] to-brass-deep px-4 py-2.5 text-[12.5px] font-bold text-white shadow-[0_10px_20px_rgba(184,134,58,0.4)] transition-transform hover:scale-105"
          >
            <Icon name="plus" className="icon !h-[15px] !w-[15px] text-white" />
            New Member
          </button>
        )}

        <NotificationBell variant="desktop" />

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-surface"
          >
            <div className="text-right">
              <div className="font-display text-[13.5px] font-bold text-heading">{name}</div>
              <div className="text-[10.5px] text-slate">{ADMIN_ROLE}</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep font-display text-[13px] font-bold text-white">
              {getInitials(name)}
            </div>
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl bg-surface shadow-elev">
              <div className="border-b border-hairline px-4 py-3">
                <div className="font-display text-[14px] font-bold text-heading">{name}</div>
                <div className="text-[11.5px] text-slate">{ADMIN_ROLE}</div>
              </div>
              <button
                onClick={() => {
                  setOpen(false)
                  navigate('/more')
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[12.5px] font-semibold text-charcoal hover:bg-paper"
              >
                <Icon name="user" className="icon !h-[15px] !w-[15px] text-heading" />
                View Profile
              </button>
              <button
                onClick={() => {
                  setOpen(false)
                  navigate('/access')
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[12.5px] font-semibold text-charcoal hover:bg-paper"
              >
                <Icon name="shield" className="icon !h-[15px] !w-[15px] text-heading" />
                Access Settings
              </button>
              <div className="border-t border-hairline" />
              <button
                onClick={() => {
                  setOpen(false)
                  logout()
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[12.5px] font-semibold text-status-alert-fg hover:bg-status-alert-bg"
              >
                <Icon name="logout" className="icon !h-[15px] !w-[15px] text-status-alert-fg" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
