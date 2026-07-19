import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { ADMIN_ROLE, useAuth } from '../auth/AuthContext'
import { getInitials } from '../utils/initials'

type GuideEntry = { icon: string; title: string; summary: string; details: string[] }

/**
 * A first-time-friendly manual: what every part of the app is, and exactly
 * what the admin can do in it. Each entry expands with "Read more".
 */
const GUIDE: GuideEntry[] = [
  {
    icon: 'home',
    title: 'Dashboard',
    summary: 'Your home screen — the whole church at a glance.',
    details: [
      "This week's celebrations (birthdays, anniversaries, baptisms, membership, new members) appear as cards — tap one to send that person a wish.",
      'The "Next notification" card shows the next automatic reminder that will go out, and warns you if automation is paused.',
      'Quick-action buttons jump straight to Attendance, Add Member, Follow-ups, Birthdays, Announcements, Reports, Members and ID Cards.',
      "Stat tiles show Total Members, Birthdays this week, New this month and last Sunday's attendance.",
      '"Notifications sent" lists this month\'s delivered pushes; "Recent activity" shows the newest member changes — tap to open a profile.',
    ],
  },
  {
    icon: 'users',
    title: 'Members',
    summary: 'Your complete church directory.',
    details: [
      'Add a member through a guided, multi-step form (personal, contact, church and family details). The Ministry and Occupation steps can be skipped.',
      'Search by name, Member ID, phone or WhatsApp number, and filter by ministry.',
      'Every member automatically gets a digital ID card with a QR code that opens their public profile.',
      'From a member you can message them on WhatsApp, edit their details, or remove them.',
    ],
  },
  {
    icon: 'cal-check',
    title: 'Attendance',
    summary: 'Mark Sunday attendance and review the history.',
    details: [
      'Mark Attendance: search the member list and tap to check someone in. Filters: All, Checked In, Not Checked In, and Newest (members added in the last 7 days).',
      'Every tick saves to the sheet instantly and records who marked it — no separate "save" step.',
      'Attendance Data: browse the last two months by date, see how many were present and who, with month / search-member / sort filters.',
      'Give Access: send a volunteer a private WhatsApp link so they can take attendance from their own phone. They only ever see Attendance + Add Member — nothing else — and you can revoke them anytime.',
    ],
  },
  {
    icon: 'cake',
    title: 'Birthdays & Anniversaries',
    summary: 'Never miss a celebration.',
    details: [
      'Five cards — Birthdays, Anniversaries, Baptisms, Membership, New Members — each fills with its colour when someone has that event today, so you see who needs wishing.',
      'Open any card for the full-year list; filter by Today, This Week, This Month or All.',
      'Send a personal wish over WhatsApp in one tap.',
      "A green tick marks who's already been wished — shared across all your devices, and it clears automatically next year.",
    ],
  },
  {
    icon: 'megaphone',
    title: 'Announcements (advanced)',
    summary: 'Three ways to reach members — bilingual, with smart links.',
    details: [
      'Send Quick Notification: an instant push to every registered device. Start from a template or write your own.',
      'Schedule Notification: compose now and it delivers automatically at the date and time you pick (within ~5 minutes of it).',
      'Send on WhatsApp: opens WhatsApp with your message ready — you choose the group or broadcast list (no bulk auto-send, by design).',
      'Language toggle: switch any message between English and తెలుగు — Telugu templates are built in.',
      'Every announcement must include a date and a time before it can send (shown as "Add date" / "Add time" chips you tap to pick from a calendar/clock). The only exception is an Emergency Update.',
      'The church name is always the bold heading members see; your typed title becomes the first line of the message.',
      'Add a link and members get a smart button — "Watch Live" (YouTube), "View Location" (Google Maps) or "Open WhatsApp".',
      'A live preview shows exactly what will arrive, and the Send button stays pinned at the bottom of the screen.',
    ],
  },
  {
    icon: 'bell',
    title: 'Automatic notifications',
    summary: 'Bilingual reminders and greetings that send on their own.',
    details: [
      'Church calendar: Sunday Worship, Bible Study, Saturday Evening Service (సిద్ధపాటు ప్రార్థన) and Daily Family Prayer — each with a day-before / 30-minute reminder and a LIVE alert, in English + Telugu.',
      'Personal greetings, sent only to that member: Birthday, Wedding, Membership and Baptism anniversaries (8 AM), plus a First-time Visitor welcome in the evening.',
      'Link rule: reminders carry the church location, live alerts carry the YouTube link, and prayer points to the WhatsApp group.',
      'Members receive these only after they turn on notifications from their own digital profile — you don\'t send them manually.',
      'You control every one of them in Access Settings.',
    ],
  },
  {
    icon: 'id',
    title: 'Membership Cards',
    summary: 'Preview, share and print digital ID cards.',
    details: [
      'Pick a member to preview both the front and back of their card, including the QR code.',
      'Share the card on WhatsApp, or download it as a PDF to print.',
      'On mobile, tap a member (or "View ID") to open their card, then use "Back to list".',
    ],
  },
  {
    icon: 'chart',
    title: 'Reports & Insights',
    summary: 'Attendance analytics.',
    details: [
      'See average attendance, the highest turnout and the attendance rate.',
      'A trend chart plots attendance per service; a breakdown lists every recorded date.',
      'Filter by month, and switch between attendance count and attendance rate.',
    ],
  },
  {
    icon: 'shield',
    title: 'Access Settings',
    summary: 'Control notifications and volunteer access.',
    details: [
      'A master switch deactivates every automatic notification at once (scheduled ones stay pending and resume when you turn it back on).',
      'Individual switches for all 18 automatic notifications.',
      'Pause notifications for one specific member from the bell on their card.',
      'Grant or revoke Attendance Taker access by email, and re-send their link.',
    ],
  },
  {
    icon: 'phone',
    title: 'How members receive notifications',
    summary: 'Members opt in themselves — once.',
    details: [
      "Each ID card has a QR code that opens the member's public profile page.",
      'On that page they tap "Get Church Notifications" to enable push on their device.',
      'Works on Android and on desktop browsers. On iPhone they must "Add to Home Screen" first, then open it from there.',
      'You never touch their phone — they enable it once and start receiving everything automatically.',
    ],
  },
]

/**
 * Admin profile — who's signed in (name, email, role; password hidden), plus a
 * detailed, expandable guide to how the whole app works.
 */
export function AdminProfileScreen() {
  const navigate = useNavigate()
  const { adminName } = useAuth()
  const name = adminName || 'Admin'
  const email = (import.meta.env.VITE_SUPER_ADMIN_EMAIL as string) || '—'

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="My Profile" onBack={() => navigate(-1)} />

      {/* Identity */}
      <Card className="mb-5 flex flex-col items-center p-6 text-center">
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep font-display text-[26px] font-bold text-white">
          {getInitials(name)}
        </div>
        <h2 className="font-display text-[18px] font-bold text-heading">{name}</h2>
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-ink-deep px-3 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white">
          <Icon name="shield" className="icon !h-[11px] !w-[11px] text-brass" />
          {ADMIN_ROLE}
        </span>
      </Card>

      {/* Account */}
      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wide text-slate">Account</div>
      <Card className="mb-6">
        <Row label="Name" value={name} />
        <Row label="Email" value={email} />
        <Row label="Password" value="••••••••" hint="Hidden for security" />
        <Row label="Role" value={ADMIN_ROLE} last />
      </Card>

      {/* How the app works */}
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-slate">How this app works</div>
      <p className="mb-2.5 text-[11.5px] leading-relaxed text-slate">
        New here? Open each section to see exactly what you can do.
      </p>
      <Card className="mb-2 p-1">
        {GUIDE.map((g, i) => (
          <GuideItem key={g.title} entry={g} last={i === GUIDE.length - 1} />
        ))}
      </Card>
      <p className="px-1 py-3 text-center text-[11px] italic text-slate">
        Sarah Living Faith Ministries · Members Hub
      </p>
    </div>
  )
}

function GuideItem({ entry, last }: { entry: GuideEntry; last: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`px-3.5 py-3 ${last ? '' : 'border-b border-hairline'}`}>
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-paper-2">
          <Icon name={entry.icon} className="icon !h-[15px] !w-[15px] text-brass-deep" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-heading">{entry.title}</div>
          <div className="mt-0.5 text-[11.5px] leading-relaxed text-slate">{entry.summary}</div>

          {open && (
            <ul className="mt-2.5 space-y-2">
              {entry.details.map((d, i) => (
                <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-charcoal">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
                  <span className="min-w-0">{d}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={() => setOpen((o) => !o)}
            className="mt-2 flex items-center gap-1 text-[11px] font-bold text-brass-deep"
          >
            {open ? 'Show less' : 'Read more'}
            <Icon
              name="chevron"
              className={`icon !h-[10px] !w-[10px] transition-transform ${open ? '-rotate-90' : 'rotate-90'}`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, hint, last }: { label: string; value: string; hint?: string; last?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-3 px-3.5 py-3 ${last ? '' : 'border-b border-hairline'}`}>
      <span className="shrink-0 text-[12px] text-slate">{label}</span>
      <span className="text-right">
        <span className="block text-[12.5px] font-semibold text-heading">{value}</span>
        {hint && <span className="mt-0.5 block text-[10px] text-faint">{hint}</span>}
      </span>
    </div>
  )
}
