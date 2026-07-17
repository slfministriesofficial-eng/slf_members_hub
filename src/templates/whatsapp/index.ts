import { CHURCH_INFO } from '../../constants/church'
import { calculateAge, calculateYearsMarried } from '../../utils/celebrations'
import type { Member } from '../../mock/types'

// "21st", "22nd", "23rd", "24th" ... "11th"/"12th"/"13th" stay "th".
function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

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

// Strips any stray U+FFFD replacement characters (a sign a string round-tripped
// through the wrong encoding somewhere), drops trailing spaces before line
// breaks, and collapses 3+ consecutive newlines down to a single blank line —
// applied once inside every builder below so the preview shown in the app is
// always byte-for-byte what gets sent to WhatsApp.
export function sanitizeWhatsappMessage(text: string): string {
  return text
    .replace(/�/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// *word* is WhatsApp's own bold markdown — rendered bold by the WhatsApp
// client itself, not by us. Built from an array of lines joined with "\n"
// (rather than a multiline template string) so spacing is explicit and
// consistent, then run through sanitizeWhatsappMessage as a final safety net.
export function buildWelcomeMessage(member: Member): string {
  const profileUrl = buildMemberProfileUrl(member.memberId)
  return sanitizeWhatsappMessage(
    [
      '🙏 Greetings from *Sarah Living Faith Ministries*!',
      '',
      `Dear *${member.name}*,`,
      'Welcome to the SLF Ministries family. Your *Digital Membership Card* is now available.',
      '',
      'You can view your verified digital membership profile using the link below:',
      profileUrl,
      '',
      'Please save this link for future reference — it will always show your latest membership information.',
      '',
      `📺 Stay connected on YouTube: ${CHURCH_INFO.social.youtube}`,
      `📷 Follow us on Instagram: ${CHURCH_INFO.social.instagram}`,
      '',
      'May God bless you and your family abundantly.',
      '',
      'With love in Christ,',
      '*Sarah Living Faith Ministries*',
      'Sarah Living Faith Ministries',
    ].join('\n'),
  )
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

// "Bro./Sis." only when gender is on file — omitted rather than guessed.
function honorific(gender: Member['gender']): string {
  if (gender === 'Male') return 'Bro. '
  if (gender === 'Female') return 'Sis. '
  return ''
}

export type BirthdayTemplateKey = 'blessing' | 'prayer' | 'greeting'
export type AnniversaryTemplateKey = 'blessing' | 'prayer' | 'family'
export type NewMemberTemplateKey = 'welcome' | 'family' | 'invitation'
export type CustomMessageTemplateKey = 'blank' | 'checkIn' | 'invitation'

export const BIRTHDAY_TEMPLATES: { key: BirthdayTemplateKey; label: string }[] = [
  { key: 'blessing', label: 'Birthday Blessing' },
  { key: 'prayer', label: 'Birthday Prayer' },
  { key: 'greeting', label: 'Birthday Greeting' },
]

export const ANNIVERSARY_TEMPLATES: { key: AnniversaryTemplateKey; label: string }[] = [
  { key: 'blessing', label: 'Anniversary Blessing' },
  { key: 'prayer', label: 'Anniversary Prayer' },
  { key: 'family', label: 'Family Blessing' },
]

export const NEW_MEMBER_TEMPLATES: { key: NewMemberTemplateKey; label: string }[] = [
  { key: 'welcome', label: 'Welcome to SLF Ministries' },
  { key: 'family', label: 'Church Family Welcome' },
  { key: 'invitation', label: 'Sunday Service Invitation' },
]

export const CUSTOM_MESSAGE_TEMPLATES: { key: CustomMessageTemplateKey; label: string }[] = [
  { key: 'blank', label: 'Blank Message' },
  { key: 'checkIn', label: 'Pastoral Check-In' },
  { key: 'invitation', label: 'Sunday Service Invitation' },
]

export function buildBirthdayMessage(key: BirthdayTemplateKey, member: Member): string {
  const name = `${honorific(member.gender)}${member.name}`
  // Omitted (not "Happy Birthday" with no number guessed) when dob isn't on file.
  const age = calculateAge(member.dob)
  const nth = age !== null ? `${ordinal(age)} ` : ''

  if (key === 'prayer') {
    return sanitizeWhatsappMessage(
      [
        `🙏 Happy ${nth}Birthday ${name}!`,
        '',
        'On your special day, we lift you up in prayer, asking God to fill your new year with His presence, provision, and perfect peace.',
        '',
        "We're grateful to have you as part of the SLF Ministries family.",
        '',
        'God bless you abundantly.',
        '',
        'With prayers,',
        '*Sarah Living Faith Ministries*',
        'Tadigadapa',
      ].join('\n'),
    )
  }
  if (key === 'greeting') {
    return sanitizeWhatsappMessage(
      [
        `🎂 Happy ${nth}Birthday, ${name}!`,
        '',
        "Wishing you a wonderful day filled with joy, laughter, and God's abundant blessings.",
        '',
        'With love,',
        '*Sarah Living Faith Ministries*',
        'Tadigadapa',
      ].join('\n'),
    )
  }
  return sanitizeWhatsappMessage(
    [
      `🎉 Happy ${nth}Birthday ${name}!`,
      '',
      'Wishing you a joyful birthday. May our Lord Jesus Christ bless you with good health, peace, wisdom, and abundant grace throughout the coming year.',
      '',
      'Thank you for being a valued member of the SLF Ministries family.',
      '',
      'May God richly bless you and your family.',
      '',
      'With love and prayers,',
      '*Sarah Living Faith Ministries*',
      'Tadigadapa',
    ].join('\n'),
  )
}

export function buildAnniversaryMessage(key: AnniversaryTemplateKey, member: Member): string {
  const name = `${honorific(member.gender)}${member.name}`
  const spouseGender = member.gender === 'Male' ? 'Female' : member.gender === 'Female' ? 'Male' : undefined
  const spouseName = member.spouse ? `${honorific(spouseGender as Member['gender'])}${member.spouse}` : ''
  const couple = spouseName ? `${name} & ${spouseName}` : name

  // Omitted when the anniversary date isn't on file, rather than guessed.
  const years = calculateYearsMarried(member.anniversary)
  const nth = years !== null ? `${ordinal(years)} ` : ''
  const yearsLine = years !== null ? `${years} wonderful years` : 'the years'

  if (key === 'prayer') {
    return sanitizeWhatsappMessage(
      [
        `🙏 Happy ${nth}Wedding Anniversary!`,
        '',
        `Dear ${couple},`,
        '',
        `We praise God for ${yearsLine} of marriage, and pray He continues to bind you together in love, faith, and unwavering commitment.`,
        '',
        'With prayers,',
        '*Sarah Living Faith Ministries*',
        'Tadigadapa',
      ].join('\n'),
    )
  }
  if (key === 'family') {
    return sanitizeWhatsappMessage(
      [
        `💐 Happy ${nth}Anniversary, ${couple}!`,
        '',
        "May your home be ever filled with God's love, laughter, and peace. Wishing your family continued grace and unity in the years ahead.",
        '',
        'With love and prayers,',
        '*Sarah Living Faith Ministries*',
        'Tadigadapa',
      ].join('\n'),
    )
  }
  return sanitizeWhatsappMessage(
    [
      `💐 Happy ${nth}Wedding Anniversary!`,
      '',
      `Dear ${couple},`,
      '',
      'May God continue to strengthen your marriage with His love, peace, and abundant blessings.',
      '',
      'Wishing you many more joyful years together.',
      '',
      'With prayers,',
      '*Sarah Living Faith Ministries*',
      'Tadigadapa',
    ].join('\n'),
  )
}

export function buildNewMemberWelcomeMessage(key: NewMemberTemplateKey, member: Member): string {
  const name = `${honorific(member.gender)}${member.name}`
  if (key === 'family') {
    return sanitizeWhatsappMessage(
      [
        `❤️ Dear ${name},`,
        '',
        "Welcome to the SLF Ministries family! We're so glad God brought you to us, and we look forward to growing together in faith and fellowship.",
        '',
        'With love,',
        '*Sarah Living Faith Ministries*',
        'Tadigadapa',
      ].join('\n'),
    )
  }
  if (key === 'invitation') {
    return sanitizeWhatsappMessage(
      [
        `📢 Dear ${name},`,
        '',
        `We'd love to see you this Sunday! Join us for worship at ${CHURCH_INFO.services[0]?.time ?? '9:00 AM'} — come as you are, and let's grow in faith together.`,
        '',
        'God bless you,',
        '*Sarah Living Faith Ministries*',
        'Tadigadapa',
      ].join('\n'),
    )
  }
  return sanitizeWhatsappMessage(
    [
      `🙏 Welcome to SLF Ministries, ${name}!`,
      '',
      'We are overjoyed to have you as part of our church family. May God bless this new chapter of your journey with us.',
      '',
      'With love in Christ,',
      '*Sarah Living Faith Ministries*',
      'Tadigadapa',
    ].join('\n'),
  )
}

// General-purpose starter templates for messaging any member directly from
// the Members directory — left short and easy to personalize, rather than a
// fixed canned message, since the admin/pastor is expected to edit before sending.
export function buildCustomMessage(key: CustomMessageTemplateKey, member: Member): string {
  const name = `${honorific(member.gender)}${member.name}`
  if (key === 'checkIn') {
    return sanitizeWhatsappMessage(
      [
        `Dear ${name},`,
        '',
        "It's been a while since we last connected, and we wanted to check in on you and your family.",
        '',
        'How have you been doing? We are praying for you and would love to hear from you.',
        '',
        'With love in Christ,',
        '*Sarah Living Faith Ministries*',
      ].join('\n'),
    )
  }
  if (key === 'invitation') {
    return sanitizeWhatsappMessage(
      [
        `Dear ${name},`,
        '',
        `We'd love to see you this Sunday! Join us for worship at ${CHURCH_INFO.services[0]?.time ?? '9:00 AM'} — come as you are.`,
        '',
        'God bless you,',
        '*Sarah Living Faith Ministries*',
      ].join('\n'),
    )
  }
  return sanitizeWhatsappMessage([`Dear ${name},`, '', '', 'God bless you,', '*Sarah Living Faith Ministries*'].join('\n'))
}

export function buildRemovalMessage(member: Member, reason: string): string {
  return sanitizeWhatsappMessage(
    [
      `Dear *${member.name}*,`,
      '',
      'We would like to inform you that your membership record with *Sarah Living Faith Ministries* has been removed from our system.',
      '',
      `Reason: ${reason}`,
      '',
      'If you believe this was a mistake or have any questions, please feel free to reach out to us.',
      '',
      'With love in Christ,',
      '*Sarah Living Faith Ministries*',
      'Sarah Living Faith Ministries',
    ].join('\n'),
  )
}
