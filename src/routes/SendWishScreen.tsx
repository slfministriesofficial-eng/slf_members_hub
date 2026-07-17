import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Avatar } from '../components/ui/Avatar'
import { Card } from '../components/ui/Card'
import { PageBackHeader } from '../components/ui/PageBackHeader'
import { useMembers } from '../features/members/MembersContext'
import {
  normalizeWhatsappNumber,
  openWhatsappWithText,
  buildBirthdayMessage,
  buildAnniversaryMessage,
  buildNewMemberWelcomeMessage,
  buildCustomMessage,
  BIRTHDAY_TEMPLATES,
  ANNIVERSARY_TEMPLATES,
  NEW_MEMBER_TEMPLATES,
  CUSTOM_MESSAGE_TEMPLATES,
} from '../templates/whatsapp'
import { markCompleted } from '../utils/completedWishes'

type WishKind = 'birthday' | 'anniversary' | 'welcome' | 'custom'

// backTo mirrors MemberQuickProfileScreen's per-kind back destination — each
// wish kind returns to the specific list it's reached from (Birthdays,
// Anniversaries, Follow-ups), rather than a generic history-back. "custom"
// (from the Members directory) has no single origin list, so it falls back
// to plain back-navigation.
const KIND_META: Record<WishKind, { title: string; backTo?: string }> = {
  birthday: { title: 'Send Birthday Wish', backTo: '/birthdays/birthdays' },
  anniversary: { title: 'Send Anniversary Wish', backTo: '/birthdays/anniversaries' },
  welcome: { title: 'Send Welcome Message', backTo: '/follow-ups' },
  custom: { title: 'Send Message' },
}

export function SendWishScreen() {
  const { kind: rawKind, memberId } = useParams<{ kind: string; memberId: string }>()
  const kind: WishKind =
    rawKind === 'anniversary' || rawKind === 'welcome' || rawKind === 'custom' ? rawKind : 'birthday'
  const navigate = useNavigate()
  const { getMember } = useMembers()
  const member = memberId ? getMember(memberId) : undefined

  const templates =
    kind === 'birthday'
      ? BIRTHDAY_TEMPLATES
      : kind === 'anniversary'
        ? ANNIVERSARY_TEMPLATES
        : kind === 'welcome'
          ? NEW_MEMBER_TEMPLATES
          : CUSTOM_MESSAGE_TEMPLATES
  const buildMessage =
    kind === 'birthday'
      ? buildBirthdayMessage
      : kind === 'anniversary'
        ? buildAnniversaryMessage
        : kind === 'welcome'
          ? buildNewMemberWelcomeMessage
          : buildCustomMessage
  const meta = KIND_META[kind]
  const goBack = () => (meta.backTo ? navigate(meta.backTo) : navigate(-1))

  const [templateKey, setTemplateKey] = useState<string>(templates[0].key)
  const [message, setMessage] = useState(() => (member ? buildMessage(templates[0].key as never, member) : ''))
  const [manualNumber, setManualNumber] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Grows/shrinks to fit the message exactly — no leftover blank space below
  // short messages, and no separate expand toggle needed to see a long one.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [message])

  if (!member) {
    return (
      <div className="pb-10">
        <PageBackHeader title={meta.title} onBack={goBack} />
        <Card className="p-8 text-center">
          <p className="text-[12.5px] text-slate">Member not found.</p>
        </Card>
      </div>
    )
  }

  const savedNumber = normalizeWhatsappNumber(member.whatsapp)
  const validNumber = savedNumber ?? normalizeWhatsappNumber(manualNumber)

  function pickTemplate(key: string) {
    setTemplateKey(key)
    setMessage(buildMessage(key as never, member!))
  }

  function sendWish() {
    if (!validNumber) return
    openWhatsappWithText(validNumber, message)
    // Custom messages aren't tied to any pending birthday/anniversary/welcome
    // list, so they shouldn't mark the member "completed" on one.
    if (kind !== 'custom') markCompleted(member!.id)
    goBack()
  }

  return (
    <>
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-32 md:pb-24">
      <PageBackHeader title={meta.title} onBack={goBack} />

      <div className="mb-5 flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card">
        <Avatar initials={member.initials} color={member.color} size={44} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-heading">{member.name}</div>
          {savedNumber ? (
            <div className="text-[12.5px] text-slate">{member.whatsapp}</div>
          ) : (
            <input
              type="tel"
              value={manualNumber}
              onChange={(e) => setManualNumber(e.target.value)}
              placeholder="Enter WhatsApp number"
              className="mt-1 w-full rounded-lg border border-hairline bg-paper px-2.5 py-1.5 text-[12.5px] text-heading outline-none focus:border-ink"
            />
          )}
        </div>
      </div>

      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate">Choose Template</span>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {templates.map((t) => (
          <button
            key={t.key}
            onClick={() => pickTemplate(t.key)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
              templateKey === t.key ? 'bg-ink-deep text-white' : 'bg-surface text-heading hover:bg-paper'
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setTemplateKey('custom')}
          className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold transition-colors ${
            templateKey === 'custom' ? 'bg-ink-deep text-white' : 'bg-surface text-heading hover:bg-paper'
          }`}
        >
          <Icon name="pencil" className="icon !h-[11px] !w-[11px]" />
          Custom Message
        </button>
      </div>

      <label className="block">
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate">Message Preview</span>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => {
            setTemplateKey('custom')
            setMessage(e.target.value)
          }}
          rows={1}
          className="w-full resize-none overflow-hidden rounded-2xl border border-hairline bg-surface px-4 py-3.5 text-[13px] leading-relaxed text-heading shadow-card outline-none focus:border-ink"
        />
      </label>
    </div>

    {/* Rendered as a sibling of the animated wrapper above, not a descendant —
        a `transform` on an ancestor (even a finished fade-rise animation
        sitting at translateY(0)) creates its own containing block for
        position:fixed children, which is what made this scroll with the
        page instead of staying pinned to the viewport. */}
    <div className="fixed inset-x-4 bottom-20 z-10 md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[420px] md:-translate-x-1/2">
      <button
        onClick={sendWish}
        disabled={!validNumber}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[#25D366] py-3.5 text-[14px] font-bold text-white shadow-elev transition-colors hover:bg-[#1FAF57] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="whatsapp" className="icon !h-[15px] !w-[15px]" />
        {kind === 'custom' ? 'Send Message' : 'Send Wishes'}
      </button>
    </div>
    </>
  )
}

