import { useNavigate } from 'react-router-dom'
import { ADMIN_ROLE, useAuth } from '../../auth/AuthContext'
import { getInitials } from '../../utils/initials'

/**
 * The signed-in admin card — avatar, name, role and a "View Profile" chip.
 * Tapping it opens the admin profile page. Shared by the mobile menu (drawer)
 * and the dashboard so both stay identical.
 * @param {() => void} [onNavigate] extra callback before navigating (e.g. close the drawer)
 */
export function AdminProfileCard({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { adminName } = useAuth()
  const name = adminName || 'Admin'

  return (
    <button
      onClick={() => {
        onNavigate?.()
        navigate('/profile')
      }}
      className="flex w-full items-center gap-3 rounded-2xl bg-surface p-3.5 text-left shadow-card transition-colors hover:bg-paper-2"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep font-display text-[15px] font-bold text-white">
        {getInitials(name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-heading">{name}</span>
        <span className="block text-[11px] text-slate">{ADMIN_ROLE}</span>
      </span>
      <span className="shrink-0 rounded-full bg-brass/10 px-2.5 py-1 text-[10.5px] font-bold text-brass-deep">
        View Profile
      </span>
    </button>
  )
}
