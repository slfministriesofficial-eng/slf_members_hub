import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { ToggleSwitch } from '../components/ui/ToggleSwitch'
import { LiveBadge } from '../notifications/scheduleView'
import {
  useNotificationSettings,
  useSetNotificationKeyEnabled,
  useSetNotificationsEnabled,
} from '../notifications/useNotificationSettings'
import { AttendanceTakersPanel } from '../attendance/AttendanceTakersPanel'

type NotificationRow = { key: string; label: string; time: string; live?: boolean }

/**
 * Every automatic notification the system can send — 18 in total — grouped
 * the way they were specified: 4 church events × (2 reminders + 1 live
 * alert), 5 personal greetings, and the scheduled-announcement queue. The
 * `key` values must match the backend's SCHEDULE keys / type keys exactly.
 */
const NOTIFICATION_SECTIONS: { title: string; icon: string; caption: string; rows: NotificationRow[] }[] = [
  {
    title: 'Sunday Worship Service',
    icon: 'sun',
    caption: 'Sunday 10:00 AM',
    rows: [
      { key: 'sun-worship-r1', label: 'Day-Before Reminder', time: 'Saturday 8:00 PM' },
      { key: 'sun-worship-r2', label: '30-Minute Reminder', time: 'Sunday 9:30 AM' },
      { key: 'sun-worship-live', label: 'Live Alert', time: 'Sunday 10:00 AM', live: true },
    ],
  },
  {
    title: 'Bible Study',
    icon: 'cross',
    caption: 'Wednesday 8:00 PM',
    rows: [
      { key: 'bible-r1', label: 'Same-Day Reminder', time: 'Wednesday 5:00 PM' },
      { key: 'bible-r2', label: '30-Minute Reminder', time: 'Wednesday 7:30 PM' },
      { key: 'bible-live', label: 'Live Alert', time: 'Wednesday 8:00 PM', live: true },
    ],
  },
  {
    title: 'Saturday Evening Service',
    icon: 'sunset',
    caption: 'Saturday 8:00 PM',
    rows: [
      { key: 'sat-eve-r1', label: 'Same-Day Reminder', time: 'Saturday 5:00 PM' },
      { key: 'sat-eve-r2', label: '30-Minute Reminder', time: 'Saturday 7:30 PM' },
      { key: 'sat-eve-live', label: 'Live Alert', time: 'Saturday 8:00 PM', live: true },
    ],
  },
  {
    title: 'SLF Family Online Prayer',
    icon: 'moon',
    caption: 'Every day 6:30 PM',
    rows: [
      { key: 'prayer-r1', label: '1-Hour Reminder', time: 'Daily 5:30 PM' },
      { key: 'prayer-r2', label: '15-Minute Reminder', time: 'Daily 6:15 PM' },
      { key: 'prayer-live', label: 'Live Alert', time: 'Daily 6:30 PM', live: true },
    ],
  },
  {
    title: 'Personal Greetings',
    icon: 'heart',
    caption: 'Sent only to that member, 8:00 AM',
    rows: [
      { key: 'birthday', label: 'Birthday Greeting', time: '8:00 AM' },
      { key: 'wedding-anniversary', label: 'Wedding Anniversary', time: '8:00 AM' },
      { key: 'membership-anniversary', label: 'Membership Anniversary', time: '8:00 AM' },
      { key: 'baptism-anniversary', label: 'Baptism Anniversary', time: '8:00 AM' },
      { key: 'visitor-welcome', label: 'First-Time Visitor Welcome', time: '7:00 PM same day' },
    ],
  },
  {
    title: 'Announcements',
    icon: 'megaphone',
    caption: 'Scheduled from the Announcements page',
    rows: [{ key: 'scheduled-announcements', label: 'Scheduled Announcements', time: 'At their chosen time' }],
  },
]

export function AccessSettingsScreen() {
  const { data: settings, isLoading: settingsLoading, isError: settingsError } = useNotificationSettings()
  const setEnabled = useSetNotificationsEnabled()
  const setKeyEnabled = useSetNotificationKeyEnabled()

  // Only the switch being saved right now is locked — the rest stay usable.
  const pendingKey = setKeyEnabled.isPending ? setKeyEnabled.variables?.key : null

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-display text-[20px] font-bold text-heading">Access Settings</h1>
        <p className="mt-1 text-[12.5px] text-slate">
          Control which automatic notifications go out, and who can take attendance.
        </p>
      </div>

      {/* ===================== NOTIFICATION ACCESS ===================== */}
      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wide text-slate">
        Notification Access
      </div>

      {settingsLoading && <Skeleton className="mb-5 h-40 w-full rounded-2xl" />}

      {settingsError && (
        <Card className="mb-5 p-5 text-center">
          <p className="text-[12.5px] text-slate">
            Could not load notification controls — deploy the latest Apps Script version, then reload.
          </p>
        </Card>
      )}

      {settings && (
        <>
          {/* Master switch — the one-button deactivate-all. */}
          <Card className="mb-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-[14px] font-bold text-heading">
                  <Icon
                    name={settings.enabled ? 'bell' : 'bell-off'}
                    className={`icon !h-[14px] !w-[14px] ${
                      settings.enabled ? 'text-status-regular-fg' : 'text-status-alert-fg'
                    }`}
                  />
                  All Notifications
                </h2>
                <p className="mt-1 text-[11.5px] leading-relaxed text-slate">
                  One switch to deactivate everything at once — nothing below sends while this is off.
                </p>
              </div>
              <ToggleSwitch
                checked={settings.enabled}
                disabled={setEnabled.isPending}
                label="All notifications"
                onChange={(next) => setEnabled.mutate(next)}
              />
            </div>
            {!settings.enabled && (
              <p className="mt-3 rounded-xl bg-status-alert-bg px-3 py-2 text-[11.5px] font-semibold leading-relaxed text-status-alert-fg">
                Deactivated — no automatic notification will be sent to any device. Scheduled announcements
                stay pending and deliver once reactivated.
              </p>
            )}
            {settings.muted.length > 0 && (
              <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate">
                <Icon name="bell-off" className="icon !h-[11px] !w-[11px] shrink-0" />
                {settings.muted.length} member{settings.muted.length === 1 ? '' : 's'} individually paused —
                manage from the bell on any member card.
              </p>
            )}
            {setEnabled.isError && (
              <p className="mt-2.5 text-[11px] font-semibold text-status-alert-fg">
                Could not save — check your connection and try again.
              </p>
            )}
          </Card>

          {/* Individual switches — one per automatic notification (18 total). */}
          <div className={`space-y-4 ${settings.enabled ? '' : 'opacity-60'}`}>
            {NOTIFICATION_SECTIONS.map((section) => (
              <section key={section.title}>
                <h3 className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-heading">
                  <Icon name={section.icon} className="icon !h-[13px] !w-[13px] text-brass-deep" />
                  {section.title}
                  <span className="font-normal text-slate">· {section.caption}</span>
                </h3>
                <Card>
                  {section.rows.map((row) => {
                    const on = !settings.disabled.includes(row.key)
                    return (
                      <div
                        key={row.key}
                        className="flex items-center gap-3 border-b border-hairline px-3.5 py-3 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`truncate text-[12.5px] font-semibold ${on ? 'text-heading' : 'text-slate line-through'}`}
                            >
                              {row.label}
                            </span>
                            {row.live && <LiveBadge />}
                          </div>
                          <div className="font-mono text-[10.5px] text-slate">{row.time}</div>
                        </div>
                        <ToggleSwitch
                          checked={on}
                          disabled={pendingKey === row.key}
                          label={`${section.title} — ${row.label}`}
                          onChange={(next) => setKeyEnabled.mutate({ key: row.key, enabled: next })}
                        />
                      </div>
                    )
                  })}
                </Card>
              </section>
            ))}
          </div>
          {setKeyEnabled.isError && (
            <p className="mt-2.5 text-[11px] font-semibold text-status-alert-fg">
              Could not save that switch — make sure the latest Apps Script version is deployed, then try
              again.
            </p>
          )}
        </>
      )}

      {/* ===================== ATTENDANCE TAKERS ===================== */}
      <div className="mb-2.5 mt-8 text-[10.5px] font-bold uppercase tracking-wide text-slate">
        Attendance Takers
      </div>
      <p className="mb-3 text-[12px] text-slate">
        Grant or revoke the Attendance Taker role — they'll only ever see the Sunday attendance screen,
        nothing else. Also available from the Attendance page's "Give Access" card.
      </p>

      <AttendanceTakersPanel />
    </div>
  )
}
