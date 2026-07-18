import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '../components/ui/Icon'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { StatusPill } from '../components/ui/StatusPill'
import { openWhatsappBroadcast, openWhatsappWithText } from '../templates/whatsapp'
import {
  fetchAttendanceTakers,
  grantAttendanceTaker,
  revokeAttendanceTaker,
  type AttendanceTaker,
  type GrantedTaker,
} from './api'

/** Normalise an Indian WhatsApp number for wa.me: digits only, 91 prefix. */
function normalizeWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10) return `91${digits}`
  return digits
}

/** The magic-link invite message sent over WhatsApp. */
function inviteMessage(url: string, name: string): string {
  const greeting = name ? `Hello ${name},\n\n` : ''
  return (
    greeting +
    "You've been given Attendance access for Sarah Living Faith Ministries.\n\n" +
    'Tap the link below on your phone to open it — keep it private, it is your personal sign-in:\n' +
    url
  )
}

/** Open WhatsApp with the invite — straight to the number when we have one. */
function sendInvite(url: string, name: string, whatsapp: string) {
  const number = normalizeWhatsapp(whatsapp)
  const message = inviteMessage(url, name)
  if (number) openWhatsappWithText(number, message)
  else openWhatsappBroadcast(message)
}

/**
 * Grant / list / revoke attendance takers. Self-contained so it can live on
 * the dedicated Give-Access page and inside Access Settings without
 * duplicating the logic. The roster never carries tokens; grant returns one
 * once, which becomes the invite link built from the app's own origin.
 * @param {{compact?: boolean}} props compact trims the form to a single row
 */
export function AttendanceTakersPanel({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [granted, setGranted] = useState<{ taker: GrantedTaker; url: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const takersQuery = useQuery({ queryKey: ['attendance-takers'], queryFn: fetchAttendanceTakers })

  const grant = useMutation({
    mutationFn: (input: { email: string; name?: string; whatsapp?: string }) => grantAttendanceTaker(input),
    onSuccess: (taker) => {
      const url = `${window.location.origin}/attend/${taker.token}`
      setGranted({ taker, url })
      setCopied(false)
      setName('')
      setEmail('')
      setWhatsapp('')
      queryClient.invalidateQueries({ queryKey: ['attendance-takers'] })
    },
  })

  const revoke = useMutation({
    mutationFn: (addr: string) => revokeAttendanceTaker(addr),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance-takers'] }),
  })
  const revokingEmail = revoke.isPending ? revoke.variables : null

  function handleGrant() {
    const addr = email.trim().toLowerCase()
    if (!addr || addr.indexOf('@') === -1 || grant.isPending) return
    grant.mutate({ email: addr, name: name.trim(), whatsapp: whatsapp.trim() })
  }

  /** Re-issue a taker's link (token is reused) and re-open the send options. */
  function resend(taker: AttendanceTaker) {
    if (grant.isPending) return
    grant.mutate({ email: taker.email, name: taker.name, whatsapp: taker.whatsapp })
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard blocked — the link stays visible for manual copy
    }
  }

  const fieldClass =
    'w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-[13px] outline-none transition-shadow placeholder:text-slate focus:shadow-card'

  return (
    <div className="space-y-4">
      {/* GRANT FORM */}
      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-heading">
          <Icon name="user" className="icon !h-[14px] !w-[14px] text-brass-deep" />
          Grant attendance access
        </h2>
        <div className={compact ? 'space-y-2.5' : 'grid gap-2.5 sm:grid-cols-2'}>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate">WhatsApp number</span>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              inputMode="tel"
              placeholder="10-digit mobile"
              className={fieldClass}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-semibold text-slate">
              Email <span className="text-status-alert-fg">*</span>
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGrant()}
              type="email"
              placeholder="name@example.com"
              className={fieldClass}
            />
          </label>
        </div>
        <button
          onClick={handleGrant}
          disabled={grant.isPending}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-ink-deep disabled:opacity-50"
        >
          <Icon name="shield" className="icon !h-[14px] !w-[14px]" />
          {grant.isPending ? 'Generating link…' : 'Grant & Create Link'}
        </button>
        {grant.isError && (
          <p className="mt-2 text-[11px] font-semibold text-status-alert-fg">
            Could not grant access — deploy the latest Apps Script version, then try again.
          </p>
        )}

        {granted && (
          <div className="mt-3 rounded-xl bg-status-regular-bg/40 p-3">
            <p className="text-[11.5px] font-bold text-heading">
              Link ready{granted.taker.name ? ` for ${granted.taker.name}` : ''} ({granted.taker.email})
            </p>
            <p className="mt-1 break-all rounded-lg bg-surface px-2.5 py-2 font-mono text-[10.5px] text-slate">
              {granted.url}
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                onClick={() => sendInvite(granted.url, granted.taker.name, granted.taker.whatsapp)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#1FAF57]"
              >
                <Icon name="whatsapp" className="icon !h-[14px] !w-[14px]" />
                Send on WhatsApp
              </button>
              <button
                onClick={() => copyLink(granted.url)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface px-3 py-2 text-[12px] font-bold text-heading transition-colors hover:bg-paper"
              >
                <Icon name={copied ? 'check' : 'copy'} className="icon !h-[13px] !w-[13px]" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-slate">
              This link is her sign-in — anyone who opens it gets attendance access. Send it only to her.
            </p>
          </div>
        )}
      </Card>

      {/* ROSTER */}
      {takersQuery.isLoading && <Skeleton className="h-24 w-full rounded-2xl" />}

      {takersQuery.isError && (
        <Card className="p-5 text-center">
          <p className="text-[12.5px] text-slate">
            Could not load attendance takers — deploy the latest Apps Script version, then reload.
          </p>
        </Card>
      )}

      {takersQuery.data && takersQuery.data.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-[12.5px] text-slate">No attendance takers yet. Grant access above.</p>
        </Card>
      )}

      {takersQuery.data && takersQuery.data.length > 0 && (
        <Card>
          {takersQuery.data.map((taker, i) => (
            <div
              key={taker.email}
              className={`flex items-center gap-3 px-3.5 py-3 ${
                i < takersQuery.data.length - 1 ? 'border-b border-hairline' : ''
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-paper-2">
                <Icon name="shield" className="icon !h-[16px] !w-[16px] text-heading" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-charcoal">
                  {taker.name || taker.email}
                </div>
                <div className="truncate text-[10.5px] text-slate">
                  {taker.name ? taker.email : taker.grantedOn ? `Granted ${taker.grantedOn}` : 'Granted'}
                </div>
              </div>
              {taker.active ? (
                <>
                  <StatusPill status="regular" label="Active" size="sm" />
                  <button onClick={() => resend(taker)} className="text-[11.5px] font-bold text-brass-deep">
                    Resend
                  </button>
                  <button
                    onClick={() => revoke.mutate(taker.email)}
                    disabled={revokingEmail === taker.email}
                    className="text-[11.5px] font-bold text-status-alert-fg disabled:opacity-50"
                  >
                    {revokingEmail === taker.email ? 'Revoking…' : 'Revoke'}
                  </button>
                </>
              ) : (
                <>
                  <StatusPill status="alert" label="Revoked" size="sm" />
                  <button onClick={() => resend(taker)} className="text-[11.5px] font-bold text-brass-deep">
                    Re-grant
                  </button>
                </>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
