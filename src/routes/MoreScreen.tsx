import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { MobileBackButton } from '../components/ui/MobileBackButton'
import { ADMIN_ROLE, useAuth } from '../auth/AuthContext'
import { useTheme } from '../theme/ThemeContext'
import { getInitials } from '../utils/initials'
import { useMembers } from '../features/members/MembersContext'
import { fetchAttendanceTakers } from '../attendance/api'
import { useNotifications } from '../notifications/useNotifications'
import { sendTestNotification, copyToken } from '../notifications/NotificationService'

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
  { icon: 'users', label: 'Members', to: '/members' },
  { icon: 'cal-check', label: 'Attendance', to: '/attendance' },
  { icon: 'flag', label: 'Follow-ups', to: '/follow-ups' },
  { icon: 'cake', label: 'Birthdays & Anniversaries', to: '/birthdays' },
  { icon: 'megaphone', label: 'Announcements', to: '/announcements' },
  { icon: 'id', label: 'Membership Cards', to: '/membership-cards' },
]

export function MoreScreen() {
  const { adminName, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { members } = useMembers()
  const name = adminName || 'Admin'

  // Real count of active attendance takers (drops the old hardcoded "1 active").
  const { data: takers } = useQuery({ queryKey: ['attendance-takers'], queryFn: fetchAttendanceTakers })
  const activeTakers = takers ? takers.filter((t) => t.active).length : null

  const { permission, token, supported, lastUpdated, enabling, denied, enableNotifications, disableNotifications } =
    useNotifications()
  const [notifToast, setNotifToast] = useState<string | null>(null)
  const [disabling, setDisabling] = useState(false)
  const notificationsEnabled = permission === 'granted' && Boolean(token)

  useEffect(() => {
    if (!notifToast) return
    const t = setTimeout(() => setNotifToast(null), 3500)
    return () => clearTimeout(t)
  }, [notifToast])

  async function handleEnable() {
    await enableNotifications()
    if (wasDeniedAfterPrompt()) {
      setNotifToast('Notifications are blocked — enable them for this site in your browser settings.')
    }
  }

  function wasDeniedAfterPrompt() {
    return typeof Notification !== 'undefined' && Notification.permission === 'denied'
  }

  async function handleDisable() {
    setDisabling(true)
    try {
      await disableNotifications()
      setNotifToast('Notifications disabled on this device.')
    } finally {
      setDisabling(false)
    }
  }

  async function handleTest() {
    const shown = await sendTestNotification()
    if (!shown) setNotifToast('Could not show a test notification — enable notifications first.')
  }

  async function handleCopyToken() {
    const copied = await copyToken()
    setNotifToast(copied ? 'Token copied to clipboard.' : 'No token to copy yet.')
  }

  /** Download the full member roster as a CSV (real export — no server needed). */
  function exportMembersCsv() {
    if (members.length === 0) {
      setNotifToast('No members to export yet.')
      return
    }
    const headers = [
      'Member ID', 'Name', 'Gender', 'Date of Birth', 'Blood Group',
      'Phone', 'WhatsApp', 'Email', 'Ministry', 'Status', 'Join Date',
    ]
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = members.map((m) =>
      [m.memberId, m.name, m.gender, m.dob, m.bloodGroup, m.phone, m.whatsapp, m.email, m.ministry, m.statusLabel, m.joinDate]
        .map(esc)
        .join(','),
    )
    const csv = [headers.map(esc).join(','), ...lines].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `slf-members-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setNotifToast(`Exported ${members.length} members to CSV.`)
  }

  function formatUpdated(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-1">
        <MobileBackButton />
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
        <button onClick={() => navigate('/reports')} className="block w-full text-left">
          <ListRow icon="chart" label="Reports & Analytics" />
        </button>
        <button onClick={exportMembersCsv} className="block w-full text-left">
          <ListRow icon="download" label="Export members (CSV)" />
        </button>
        <button onClick={() => navigate('/registration-forms')} className="block w-full text-left">
          <ListRow icon="note" label="Registration Forms" />
        </button>
      </Card>

      <h2 className="mb-2.5 font-display text-[15.5px] font-bold text-heading">Access &amp; controls</h2>
      <Card className="mb-5">
        <button onClick={() => navigate('/access')} className="block w-full text-left">
          <ListRow icon="bell" label="Notification Settings" />
        </button>
        <button onClick={() => navigate('/access')} className="block w-full text-left">
          <ListRow
            icon="shield"
            label="Attendance Taker access"
            value={activeTakers !== null ? `${activeTakers} active` : undefined}
          />
        </button>
      </Card>

      <h2 className="mb-2.5 font-display text-[15.5px] font-bold text-heading">Preferences</h2>
      <Card className="mb-5">
        <ListRow
          icon="moon"
          label="Dark mode"
          right={<Switch on={theme === 'dark'} onToggle={toggleTheme} />}
        />
      </Card>

      <h2 className="mb-2.5 font-display text-[15.5px] font-bold text-heading">Notifications</h2>
      <Card className="mb-5">
        <ListRow
          icon="bell"
          label="Status"
          right={
            <span
              className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                notificationsEnabled
                  ? 'bg-status-regular-bg text-status-regular-fg'
                  : 'bg-status-alert-bg text-status-alert-fg'
              }`}
            >
              {notificationsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          }
        />
        {!supported && (
          <div className="border-b border-hairline px-3.5 py-3 text-[12px] text-slate last:border-b-0">
            Push notifications aren't supported in this browser.
          </div>
        )}
        {supported && denied && !notificationsEnabled && (
          <div className="border-b border-hairline px-3.5 py-3 text-[12px] text-slate last:border-b-0">
            Notifications are blocked for this site. To turn them on, allow notifications for this app in your
            browser or device settings — the app can't re-ask once blocked.
          </div>
        )}
        {supported && !denied && !notificationsEnabled && (
          <div className="border-b border-hairline px-3.5 py-3 last:border-b-0">
            <button
              onClick={handleEnable}
              disabled={enabling}
              className="w-full rounded-full bg-ink py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-ink-deep disabled:opacity-50"
            >
              {enabling ? 'Enabling…' : 'Enable Notifications'}
            </button>
          </div>
        )}
        {notificationsEnabled && (
          <>
            <ListRow icon="check" label="Last updated" value={formatUpdated(lastUpdated)} />
            <ListRow icon="lock-small" label="Current token" value="••••••••" />
            <div className="flex flex-col gap-2 border-b border-hairline px-3.5 py-3 last:border-b-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleTest}
                  className="rounded-full border border-hairline bg-surface py-2.5 text-[12px] font-bold text-heading transition-colors hover:bg-paper"
                >
                  Send Test
                </button>
                <button
                  onClick={handleCopyToken}
                  className="rounded-full border border-hairline bg-surface py-2.5 text-[12px] font-bold text-heading transition-colors hover:bg-paper"
                >
                  Copy Token
                </button>
              </div>
              <button
                onClick={handleDisable}
                disabled={disabling}
                className="rounded-full bg-status-alert-bg py-2.5 text-[12px] font-bold text-status-alert-fg transition-colors hover:brightness-95 disabled:opacity-50"
              >
                {disabling ? 'Disabling…' : 'Disable Notifications (this device)'}
              </button>
            </div>
          </>
        )}
      </Card>

      <h2 className="mb-2.5 font-display text-[15.5px] font-bold text-heading">Account</h2>
      <Card className="mb-6">
        <button onClick={logout} className="block w-full text-left">
          <ListRow icon="logout" label="Log out" danger right={<span />} />
        </button>
      </Card>

      {notifToast && (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-8 motion-safe:animate-[fade-rise_0.3s_ease-out]">
          <div className="flex max-w-[92vw] items-center gap-2 rounded-full bg-ink-deep px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-elev">
            <Icon name="bell" className="icon !h-[14px] !w-[14px] shrink-0 text-white" />
            <span className="truncate">{notifToast}</span>
          </div>
        </div>
      )}
    </div>
  )
}
