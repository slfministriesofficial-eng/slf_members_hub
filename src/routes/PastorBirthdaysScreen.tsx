import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { usePastors } from '../features/pastors/PastorsContext'
import { PastorSendList } from '../features/pastors/PastorSendList'
import type { Pastor } from '../features/pastors/types'
import {
  buildPastorBirthdayMessage,
  PASTOR_BIRTHDAY_TEMPLATES,
  type PastorBirthdayTemplateKey,
} from '../templates/whatsapp/pastors'
import { derivePastorBirthdays } from '../features/pastors/birthdays'
import { formatCountdown } from '../utils/celebrations'

/**
 * Pastor birthdays — who is next, and a one-tap WhatsApp greeting for each.
 * Separate from the members' Birthdays screen on purpose: different register,
 * different wording, and the fellowship shouldn't mix into church celebrations.
 */
export function PastorBirthdaysScreen() {
  const navigate = useNavigate()
  const { pastors, isLoading, isError } = usePastors()
  const [template, setTemplate] = useState<PastorBirthdayTemplateKey>('blessing')
  // Owned here, not inside the lists — the Today and Coming-up lists are two
  // separate PastorSendLists and must share one record of who has been wished.
  const [sent, setSent] = useState<Set<string>>(new Set())
  const markSent = useCallback((memberId: string) => {
    setSent((prev) => new Set(prev).add(memberId))
  }, [])

  const now = useMemo(() => new Date(), [])
  const entries = useMemo(() => derivePastorBirthdays(pastors, now), [pastors, now])
  const byId = useMemo(() => new Map(entries.map((e) => [e.pastor.memberId, e])), [entries])

  const today = entries.filter((e) => e.isToday)
  const upcoming = entries.filter((e) => !e.isToday)

  const messageFor = useCallback(
    (pastor: Pastor) => buildPastorBirthdayMessage(template, pastor),
    [template],
  )

  const subtitleFor = useCallback(
    (pastor: Pastor) => {
      const entry = byId.get(pastor.memberId)
      if (!entry) return null
      const date = entry.nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      return `${date}${entry.age !== null ? ` · turns ${entry.age}` : ''}${
        entry.isToday ? '' : ` · ${formatCountdown(entry.daysAway)}`
      }`
    },
    [byId],
  )

  const listProps = {
    messageFor,
    subtitleFor,
    actionLabel: 'Wish',
    sentLabel: 'Sent',
    sent,
    onSent: markSent,
  }

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <PageBackHeader title="Pastor Birthdays" onBack={() => navigate('/pastors')} />
      <p className="mb-5 text-[12.5px] text-slate">
        Send a birthday greeting on WhatsApp to a pastor in the fellowship.
      </p>

      {isError && (
        <div className="rounded-2xl bg-surface px-6 py-10 text-center shadow-card">
          <p className="text-[13.5px] font-bold text-heading">Could not load the pastors register</p>
          <p className="mx-auto mt-1 max-w-[340px] text-[12px] text-slate">
            Check your connection, and make sure the latest Apps Script version is deployed.
          </p>
        </div>
      )}

      {!isError && (
        <>
          <div className="mb-4">
            <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-slate">
              Message style
            </div>
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
                  : 'None of the registered pastors have a usable date of birth on file.'}
              </p>
            </div>
          )}

          {today.length > 0 && (
            <>
              <h2 className="mb-2 font-display text-[15px] font-bold text-heading">Today 🎂</h2>
              <div className="mb-5 rounded-2xl ring-2 ring-brass/40">
                <PastorSendList pastors={today.map((e) => e.pastor)} {...listProps} />
              </div>
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <h2 className="mb-2 font-display text-[15px] font-bold text-heading">Coming up</h2>
              <PastorSendList pastors={upcoming.map((e) => e.pastor)} {...listProps} />
            </>
          )}
        </>
      )}
    </div>
  )
}
