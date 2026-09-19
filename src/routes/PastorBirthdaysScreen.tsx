import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Avatar } from '../components/ui/Avatar'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { usePastors } from '../features/pastors/PastorsContext'
import type { Pastor } from '../features/pastors/types'
import { normalizeWhatsappNumber, openWhatsappWithText } from '../templates/whatsapp'
import {
  buildPastorBirthdayMessage,
  PASTOR_BIRTHDAY_TEMPLATES,
  type PastorBirthdayTemplateKey,
} from '../templates/whatsapp/pastors'
import { calculateAge, formatCountdown } from '../utils/celebrations'

type Entry = {
  pastor: Pastor
  nextDate: Date
  daysAway: number
  age: number | null
  isToday: boolean
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** The next time this day-and-month comes around, today included. */
function nextOccurrence(month: number, day: number, today: Date): Date {
  const candidate = new Date(today.getFullYear(), month, day)
  if (candidate < today) candidate.setFullYear(today.getFullYear() + 1)
  return candidate
}

/** Pastor birthdays, soonest first. Entries without a usable date of birth are
 *  left out rather than guessed at. */
function derivePastorBirthdays(pastors: Pastor[], now = new Date()): Entry[] {
  const today = startOfDay(now)
  return pastors
    .map((pastor) => {
      const parsed = pastor.dob ? new Date(pastor.dob) : null
      if (!parsed || Number.isNaN(parsed.getTime())) return null
      const nextDate = nextOccurrence(parsed.getMonth(), parsed.getDate(), today)
      const daysAway = Math.round((nextDate.getTime() - today.getTime()) / 86_400_000)
      return {
        pastor,
        nextDate,
        daysAway,
        age: calculateAge(pastor.dob, nextDate),
        isToday: daysAway === 0,
      }
    })
    .filter((e): e is Entry => e !== null)
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
}

/**
 * Pastor birthdays — who is next, and a one-tap WhatsApp greeting for each.
 * Separate from the members' Birthdays screen on purpose: different register,
 * different wording, and the fellowship shouldn't mix into church celebrations.
 */
export function PastorBirthdaysScreen() {
  const navigate = useNavigate()
  const { pastors, isLoading } = usePastors()
  const [template, setTemplate] = useState<PastorBirthdayTemplateKey>('blessing')
  const [sent, setSent] = useState<Set<string>>(new Set())

  const entries = useMemo(() => derivePastorBirthdays(pastors), [pastors])
  const today = entries.filter((e) => e.isToday)
  const upcoming = entries.filter((e) => !e.isToday)

  function send(pastor: Pastor) {
    const number = normalizeWhatsappNumber(pastor.whatsapp || pastor.mobile)
    if (!number) return
    openWhatsappWithText(number, buildPastorBirthdayMessage(template, pastor))
    setSent((prev) => new Set(prev).add(pastor.memberId))
  }

  function Row({ entry }: { entry: Entry }) {
    const number = normalizeWhatsappNumber(entry.pastor.whatsapp || entry.pastor.mobile)
    const isSent = sent.has(entry.pastor.memberId)
    return (
      <div className="flex items-center gap-2.5 border-b border-hairline py-2.5 last:border-0">
        <Avatar initials={entry.pastor.initials} color={entry.pastor.color} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold text-heading">{entry.pastor.fullName}</div>
          <div className="truncate text-[11px] text-slate">
            {entry.nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {entry.age !== null ? ` · turns ${entry.age}` : ''}
            {entry.isToday ? '' : ` · ${formatCountdown(entry.daysAway)}`}
          </div>
        </div>
        <button
          onClick={() => send(entry.pastor)}
          disabled={!number}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[11.5px] font-bold transition-transform disabled:opacity-40 ${
            isSent ? 'bg-status-regular-bg text-status-regular-fg' : 'bg-[#25D366] text-white hover:scale-105'
          }`}
        >
          <Icon name={isSent ? 'check' : 'whatsapp'} className="icon !h-[13px] !w-[13px]" />
          {isSent ? 'Sent' : 'Wish'}
        </button>
      </div>
    )
  }

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="Pastor Birthdays" onBack={() => navigate('/pastors')} />
      <p className="mb-5 text-[12.5px] text-slate">
        Send a birthday greeting on WhatsApp to a pastor in the fellowship.
      </p>

      <div className="mb-4">
        <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-slate">Message style</div>
        <div className="flex flex-wrap gap-2">
          {PASTOR_BIRTHDAY_TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTemplate(t.key)}
              className={`rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
                template === t.key ? 'bg-ink text-white' : 'bg-surface text-heading shadow-card'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="py-8 text-center text-[12.5px] text-slate">Loading…</p>}

      {!isLoading && entries.length === 0 && (
        <div className="rounded-2xl bg-surface px-6 py-12 text-center shadow-card">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brass to-brass-deep">
            <Icon name="cake" className="icon !h-[20px] !w-[20px] text-white" />
          </span>
          <p className="text-[13.5px] font-bold text-heading">No birthdays to show</p>
          <p className="mx-auto mt-1 max-w-[300px] text-[12px] text-slate">
            {pastors.length === 0
              ? 'Register a pastor first.'
              : 'None of the registered pastors have a date of birth on file.'}
          </p>
        </div>
      )}

      {today.length > 0 && (
        <>
          <h2 className="mb-2 font-display text-[15px] font-bold text-heading">Today 🎂</h2>
          <div className="mb-5 rounded-2xl bg-surface px-3.5 shadow-card ring-2 ring-brass/40">
            {today.map((e) => (
              <Row key={e.pastor.memberId} entry={e} />
            ))}
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-2 font-display text-[15px] font-bold text-heading">Coming up</h2>
          <div className="rounded-2xl bg-surface px-3.5 shadow-card">
            {upcoming.map((e) => (
              <Row key={e.pastor.memberId} entry={e} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
