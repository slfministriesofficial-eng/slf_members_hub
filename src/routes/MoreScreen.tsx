import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { ADMIN_ROLE, useAuth } from '../auth/AuthContext'
import { useTheme } from '../theme/ThemeContext'
import { getInitials } from '../utils/initials'

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
        on ? 'bg-ink' : 'bg-paper-2'
      }`}
    >
      <span
        className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all ${
          on ? 'right-0.5' : 'left-0.5'
        }`}
      />
    </button>
  )
}

function ListRow({
  icon,
  label,
  value,
  danger,
  right,
}: {
  icon: string
  label: string
  value?: string
  danger?: boolean
  right?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b border-hairline px-3.5 py-3 last:border-b-0">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${
          danger ? 'bg-status-alert-bg' : 'bg-paper-2'
        }`}
      >
        <Icon
          name={icon}
          className={`icon !h-[15px] !w-[15px] ${danger ? 'text-status-alert-fg' : 'text-heading'}`}
        />
      </div>
      <span className={`flex-1 text-[12.5px] font-semibold ${danger ? 'text-status-alert-fg' : 'text-charcoal'}`}>
        {label}
      </span>
      {value && <span className="font-mono text-[11.5px] text-slate">{value}</span>}
      {right}
      {!right && !value && (
        <Icon name="chevron" className="icon !h-[15px] !w-[15px] text-faint" />
      )}
    </div>
  )
}

const MOBILE_QUICK_LINKS = [
  { icon: 'flag', label: 'Follow-ups', to: '/follow-ups' },
  { icon: 'cake', label: 'Birthdays & Anniversaries', to: '/birthdays' },
  { icon: 'megaphone', label: 'Announcements', to: '/announcements' },
  { icon: 'id', label: 'Membership Cards', to: '/membership-cards' },
]

export function MoreScreen() {
  const [digest, setDigest] = useState(true)
  const { adminName, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const name = adminName || 'Admin'

  return (
    <div>
      <div className="mb-4 flex items-start justify-between">
        <h1 className="font-display text-[20px] font-bold text-heading">More</h1>
      </div>

      <div className="mb-5 flex flex-col items-center pb-3.5 text-center md:flex-row md:items-center md:justify-start md:gap-4 md:pb-6 md:text-left">
        <div className="mb-2.5 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep font-display text-[20px] font-bold text-white md:mb-0">
          {getInitials(name)}
        </div>
        <div>
          <h3 className="font-display text-[16px] font-bold text-heading">{name}</h3>
          <div className="text-[12px] text-slate">{ADMIN_ROLE}</div>
        </div>
      </div>

      {/* Desktop reaches these via the sidebar directly — this is the mobile-only stand-in */}
      <h2 className="mb-2.5 font-display text-[15.5px] font-bold text-heading md:hidden">Church tools</h2>
      <Card className="mb-5 md:hidden">
        {MOBILE_QUICK_LINKS.map((link) => (
          <button key={link.to} onClick={() => navigate(link.to)} className="block w-full text-left">
            <ListRow icon={link.icon} label={link.label} />
          </button>
        ))}
      </Card>

      <h2 className="mb-2.5 font-display text-[15.5px] font-bold text-heading">Insights</h2>
      <Card className="mb-5">
        <ListRow icon="chart" label="Reports & Analytics" />
        <ListRow icon="download" label="Export members / reports" />
      </Card>

      <h2 className="mb-2.5 font-display text-[15.5px] font-bold text-heading">Access &amp; safety</h2>
      <Card className="mb-5">
        <ListRow icon="shield" label="Attendance Taker access" value="1 active" />
        <ListRow icon="cloud" label="Weekly data backup" value="Sun 2 AM" />
        <ListRow
          icon="bell"
          label="Daily email digest"
          right={<Switch on={digest} onToggle={() => setDigest((d) => !d)} />}
        />
        <ListRow
          icon="moon"
          label="Dark mode"
          right={<Switch on={theme === 'dark'} onToggle={toggleTheme} />}
        />
      </Card>

      <h2 className="mb-2.5 font-display text-[15.5px] font-bold text-heading">Account</h2>
      <Card className="mb-6">
        <button onClick={logout} className="block w-full text-left">
          <ListRow icon="logout" label="Log out" danger right={<span />} />
        </button>
      </Card>
    </div>
  )
}
