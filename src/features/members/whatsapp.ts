import { CHURCH_INFO } from '../../constants/church'
import type { Member } from '../../mock/types'

// wa.me needs country code, no leading zeros, no spaces/punctuation. Stored
// numbers are plain 10-digit Indian mobiles, so a bare 10-digit number is
// assumed local and gets the country code prepended; anything longer is
// assumed to already include one.
export function normalizeWhatsappNumber(raw: string | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  if (digits.length > 10) return digits
  return null
}

export function buildMemberProfileUrl(memberId: string): string {
  return `${window.location.origin}/member?id=${encodeURIComponent(memberId)}`
}

// *word* is WhatsApp's own bold markdown — rendered bold by the WhatsApp
// client itself, not by us. Sections are separated by a single blank line;
// related sentences share a line so the message doesn't read as one word
// per line once WhatsApp renders it.
export function buildWelcomeMessage(member: Member): string {
  const profileUrl = buildMemberProfileUrl(member.memberId)
  return `🙏 Greetings from *SLF Ministries*!

Dear *${member.name}*,
Welcome to the SLF Ministries family. Your *Digital Membership Card* is now available.

You can view your verified digital membership profile using the link below:
${profileUrl}

Please save this link for future reference — it will always show your latest membership information.

📺 Stay connected on YouTube: ${CHURCH_INFO.social.youtube}
📷 Follow us on Instagram: ${CHURCH_INFO.social.instagram}

May God bless you and your family abundantly.

With love in Christ,
*SLF Ministries*
Sarah Living Faith Ministries`
}

export function openWhatsappWithText(number: string, message: string): void {
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
}

// No specific recipient — used for broadcast-style messages (announcements),
// where the admin picks a contact, group, or broadcast list inside WhatsApp
// itself once it opens. There's no bulk-send here on purpose: doing that for
// real would require the WhatsApp Business API, which this app intentionally
// avoids — see the standing "no third-party/Business API" rule for this app.
export function openWhatsappBroadcast(message: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
}

export function openWhatsappChat(member: Member, number: string): void {
  openWhatsappWithText(number, buildWelcomeMessage(member))
}

export function buildRemovalMessage(member: Member, reason: string): string {
  return `Dear *${member.name}*,

We would like to inform you that your membership record with *SLF Ministries* has been removed from our system.

Reason: ${reason}

If you believe this was a mistake or have any questions, please feel free to reach out to us.

With love in Christ,
*SLF Ministries*
Sarah Living Faith Ministries`
}
