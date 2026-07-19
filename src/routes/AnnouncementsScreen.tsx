import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { MobileBackButton } from '../components/ui/MobileBackButton'
import { ViewAllButton } from '../components/ui/ViewAllButton'
import { useMembers } from '../features/members/MembersContext'
import { useMemberNotificationStatuses } from '../notifications/NotificationStatusBell'
import { cleanTitle, useNotificationHistory, useTokenCount } from '../notifications/scheduleView'

/**
 * Announcements hub — the three ways to reach members, each as a clear card
 * that opens its own focused flow:
 *   1. Send Quick Notification  → instant push to every registered device
 *   2. Schedule Notification    → composed now, delivered automatically later
 *   3. Send on WhatsApp         → share to a group/broadcast list via WhatsApp
 */
export function AnnouncementsScreen() {
  const navigate = useNavigate()
  const { members, isLoading } = useMembers()
  const { data: deviceCount } = useTokenCount()
  const { data: history } = useNotificationHistory()
  const now = useMemo(() => new Date(), [])

  const memberCount = isLoading ? 0 : members.length
  const { data: notificationStatuses } = useMemberNotificationStatuses()
  const enabledMemberCount =
    notificationStatuses && !isLoading
      ? members.filter((m) => Boolean(notificationStatuses[m.memberId])).length
      : null
  const disabledMemberCount = enabledMemberCount === null ? null : memberCount - enabledMemberCount

  const recentSends = history?.slice(0, 3) ?? null

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <div className="mb-1 flex items-center gap-1">
        <MobileBackButton />
        <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">Announcements</h1>
      </div>
      <p className="mb-5 text-[12.5px] text-slate">
        Send updates and important information to your members.
      </p>

      {/* THE THREE WAYS TO SEND — stacked on mobile, three columns on desktop. */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <ActionCard
          icon="bell"
          iconBg="bg-gradient-to-br from-ink to-ink-deep"
          buttonBg="bg-ink hover:bg-ink-deep"
          title="Send Quick Notification"
          description="Push instantly to every registered device."
          meta={deviceCount != null ? `Reaches ${deviceCount} device${deviceCount === 1 ? '' : 's'}` : 'Loading devices…'}
          metaIcon="bell"
          onClick={() => navigate('/announcements/send')}
        />
        <ActionCard
          icon="cal-check"
          iconBg="bg-gradient-to-br from-brass to-brass-deep"
          buttonBg="bg-brass-deep hover:brightness-110"
          title="Schedule Notification"
          description="Compose now, deliver automatically later."
          meta="Delivers within 5 minutes of the chosen time"
          metaIcon="clock"
          onClick={() => navigate('/announcements/schedule')}
        />
        <ActionCard
          icon="whatsapp"
          iconBg="bg-[#25D366]"
          buttonBg="bg-[#25D366] hover:bg-[#1FAF57]"
          title="Send on WhatsApp"
          description="Share to a group or broadcast list."
          meta="Opens WhatsApp — you pick the group"
          metaIcon="share"
          onClick={() => navigate('/announcements/whatsapp')}
        />
      </div>

      {/* REACH STATS */}
      <div className="mb-6 grid grid-cols-3 gap-2 md:gap-3">
        <AnnouncementStatCard icon="users" label="Total Members" value={isLoading ? '—' : String(memberCount)} />
        <AnnouncementStatCard
          icon="bell"
          label="Notifications Enabled"
          value={enabledMemberCount === null ? '—' : String(enabledMemberCount)}
        />
        <AnnouncementStatCard
          icon="bell-off"
          label="Notifications Disabled"
          value={disabledMemberCount === null ? '—' : String(disabledMemberCount)}
        />
      </div>

      {/* RECENTLY SENT — quick confirmation the last sends went out. */}
      {recentSends && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-[15.5px] font-bold text-heading">Recently sent</h2>
            {recentSends.length > 0 && <ViewAllButton onClick={() => navigate('/notifications-sent')} />}
          </div>
          {recentSends.length === 0 ? (
            <Card className="p-5 text-center">
              <p className="text-[12.5px] text-slate">Nothing sent yet this month.</p>
            </Card>
          ) : (
            <Card>
              {recentSends.map((item, i) => (
                <div
                  key={`${item.sentAt}-${i}`}
                  className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-2.5 last:border-b-0"
                >
                  <Icon name="megaphone" className="icon !h-[14px] !w-[14px] shrink-0 text-brass-deep" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-heading">
                      {cleanTitle(item.title) || 'Notification'}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-slate">{sentTimeLabel(item.sentAt, now)}</div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-status-regular-bg px-2 py-1 text-[10.5px] font-bold text-status-regular-fg">
                    <Icon name="check" className="icon !h-[10px] !w-[10px]" />
                    {item.sent} device{item.sent === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </section>
      )}
    </div>
  )
}

/** "Today · 6:32 PM" for same-day sends, "15 Jul · 8:00 AM" otherwise. */
function sentTimeLabel(iso: string, now: Date): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return `Today · ${time}`
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) + ` · ${time}`
}

/** One of the three big send-method cards — the bottom button carries the flow color. */
function ActionCard({
  icon,
  iconBg,
  buttonBg,
  title,
  description,
  meta,
  metaIcon,
  onClick,
}: {
  icon: string
  iconBg: string
  buttonBg: string
  title: string
  description: string
  meta: string
  metaIcon: string
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick()
      }}
      className="motion-safe:animate-[fade-rise_0.3s_ease-out_both] flex cursor-pointer flex-col rounded-2xl bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elev md:p-5"
    >
      <div className="flex items-center gap-3.5 md:flex-col md:items-start md:gap-0">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl md:mb-3 ${iconBg}`}>
          <Icon name={icon} className="icon !h-[21px] !w-[21px] text-white" />
        </span>
        <span className="min-w-0 flex-1 md:flex-none">
          <span className="block text-[14.5px] font-bold text-heading">{title}</span>
          <span className="mt-0.5 block text-[12px] leading-snug text-slate">{description}</span>
          <span className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-brass-deep">
            <Icon name={metaIcon} className="icon !h-[11px] !w-[11px]" />
            {meta}
          </span>
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className={`mt-3.5 w-full rounded-full py-2.5 text-[12px] font-bold text-white transition-transform hover:scale-[1.02] ${buttonBg}`}
      >
        {title}
      </button>
    </div>
  )
}

// Same stat-card treatment as the Members and Attendance pages — centered
// icon/number/label on mobile, horizontal row on desktop.
function AnnouncementStatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface p-2.5 text-center shadow-card transition-shadow hover:shadow-elev md:flex-row md:items-center md:gap-3 md:p-3.5 md:text-left">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep md:h-10 md:w-10">
        <Icon name={icon} className="icon !h-[14px] !w-[14px] text-white md:!h-[17px] md:!w-[17px]" />
      </span>
      <div className="min-w-0">
        <div className="font-display text-[16px] font-bold leading-none text-heading md:text-[19px]">{value}</div>
        <div className="mt-1 line-clamp-2 text-[8.5px] font-semibold uppercase leading-tight tracking-wide text-slate md:truncate md:text-[10px]">
          {label}
        </div>
      </div>
    </div>
  )
}
