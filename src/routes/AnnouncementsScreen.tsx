import { useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { useAuth } from '../auth/AuthContext'
import { openWhatsappBroadcast } from '../features/members/whatsapp'

type Announcement = {
  id: string
  title: string
  message: string
  sentBy: string
  sentAt: string
  status: 'Sent' | 'Draft'
}

type FilterKey = 'All' | 'Sent' | 'Draft'

const FILTERS: FilterKey[] = ['All', 'Sent', 'Draft']

export function AnnouncementsScreen() {
  const { adminName } = useAuth()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('All')

  const canSubmit = title.trim().length > 0 && message.trim().length > 0

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      if (filter !== 'All' && a.status !== filter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        if (!a.title.toLowerCase().includes(q) && !a.message.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [announcements, search, filter])

  function handleSubmit(status: 'Draft' | 'Sent') {
    if (!canSubmit) return
    const entry: Announcement = {
      id: crypto.randomUUID(),
      title: title.trim(),
      message: message.trim(),
      sentBy: adminName || 'Admin',
      sentAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      status,
    }
    setAnnouncements((prev) => [entry, ...prev])
    if (status === 'Sent') {
      openWhatsappBroadcast(`*${entry.title}*\n\n${entry.message}`)
    }
    setTitle('')
    setMessage('')
  }

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <div className="mb-5">
        <h1 className="font-display text-[22px] font-bold text-heading md:text-[26px]">Announcements</h1>
        <p className="mt-1 text-[12.5px] text-slate">Compose and send updates to your members.</p>
      </div>

      <Card className="p-4 md:p-5">
        <label className="mb-3 block">
          <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            className="w-full rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate focus:border-ink"
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-slate">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Write your announcement…"
            className="w-full resize-none rounded-xl border border-hairline bg-paper px-3.5 py-3 text-[14px] text-heading outline-none transition-colors placeholder:text-slate focus:border-ink"
          />
        </label>
        <div className="flex gap-2.5">
          <button
            onClick={() => handleSubmit('Draft')}
            disabled={!canSubmit}
            className="flex-1 rounded-xl border border-hairline bg-surface py-3 text-[13px] font-bold text-heading transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSubmit('Sent')}
            disabled={!canSubmit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink py-3 text-[13px] font-bold text-white transition-colors hover:bg-ink-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="chat" className="icon !h-[15px] !w-[15px]" />
            Send Announcement
          </button>
        </div>
      </Card>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Icon
            name="search"
            className="icon !h-[14px] !w-[14px] pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search announcements…"
            className="w-full rounded-full border border-hairline bg-surface py-2.5 pl-9 pr-4 text-[13px] text-heading outline-none placeholder:text-slate focus:border-ink sm:w-64"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
                filter === f ? 'bg-ink-deep text-white' : 'bg-paper text-heading hover:bg-paper-2'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <Icon name="megaphone" className="icon !h-6 !w-6 mx-auto mb-2 text-slate" />
            <p className="text-[13px] text-slate">
              {announcements.length === 0
                ? 'No announcements yet. Compose one above to get started.'
                : 'No announcements match your search.'}
            </p>
          </Card>
        ) : (
          filtered.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[14.5px] font-bold text-heading">{a.title}</h3>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                    a.status === 'Sent'
                      ? 'bg-status-regular-bg text-status-regular-fg'
                      : 'bg-status-inactive-bg text-status-inactive-fg'
                  }`}
                >
                  {a.status}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-line text-[13px] text-charcoal">{a.message}</p>
              <p className="mt-2.5 text-[11px] text-slate">
                {a.status === 'Sent' ? 'Sent' : 'Saved'} by {a.sentBy} · {a.sentAt}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
