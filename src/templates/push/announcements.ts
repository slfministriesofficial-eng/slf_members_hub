import { CHURCH_INFO } from '../../constants/church'

/**
 * Announcement starter templates for the composer (used for BOTH the push
 * notification and the WhatsApp share). Messages read as a natural
 * description with [Date] / [Time] placeholders the admin fills in — no
 * stacked Date/Time/Venue label lines — and close with the bold church
 * signature. The `*asterisks*` are WhatsApp bold markers: WhatsApp renders
 * them bold, and the push path strips them to clean text automatically.
 */
export type Template = { key: string; label: string; title: string; message: string }

/** "SLF Ministries, Tadigadapa" — venue name without the trailing comma. */
export const VENUE_LINE = CHURCH_INFO.addressLines[0]?.replace(/,\s*$/, '') ?? CHURCH_INFO.shortName

/** Bold full church name — the standard sign-off on every announcement. */
export const SIGN_OFF = '*Sarah Living Faith Ministries*'

export const TEMPLATES: Template[] = [
  {
    key: 'sunday-service',
    label: 'Sunday Service',
    title: 'Sunday Service Reminder',
    message: [
      'Dear Church Family,',
      '',
      `We warmly invite you and your family to join us for this Sunday's worship service on [Date] at [Time], at ${VENUE_LINE}.`,
      '',
      "Come together in worship, prayer, and fellowship as we grow in God's presence.",
      '',
      'God bless you and your family.',
      '',
      SIGN_OFF,
    ].join('\n'),
  },
  {
    key: 'prayer-meeting',
    label: 'Prayer Meeting',
    title: 'Prayer Meeting Reminder',
    message: [
      'Dear Church Family,',
      '',
      `Join us for our Prayer Meeting on [Date] at [Time], at ${VENUE_LINE}, as we gather to seek God's guidance and blessings.`,
      '',
      '"Prayer changes everything."',
      '',
      'We look forward to praying with you.',
      '',
      SIGN_OFF,
    ].join('\n'),
  },
  {
    key: 'youth-meeting',
    label: 'Youth Meeting',
    title: 'Youth Fellowship',
    message: [
      'Dear Youth,',
      '',
      `You are invited to our Youth Fellowship on [Date] at [Time], at ${VENUE_LINE}.`,
      '',
      'Come with your friends for worship, Bible study, fellowship and fun.',
      '',
      'See you there!',
      '',
      SIGN_OFF,
    ].join('\n'),
  },
  {
    key: 'choir-practice',
    label: 'Choir Practice',
    title: 'Choir Practice Reminder',
    message: [
      'Dear Choir Members,',
      '',
      `This is a reminder about our choir practice on [Date] at [Time], at ${VENUE_LINE}.`,
      '',
      'Please arrive a few minutes early and come prepared for worship practice.',
      '',
      'Thank you for serving God through music.',
      '',
      SIGN_OFF,
    ].join('\n'),
  },
  {
    key: 'bible-study',
    label: 'Bible Study',
    title: 'Bible Study Invitation',
    message: [
      'Dear Church Family,',
      '',
      `Join us for this week's Bible Study on [Date] at [Time], at ${VENUE_LINE}.`,
      '',
      "Come and grow deeper in God's Word together.",
      '',
      'We look forward to seeing you.',
      '',
      SIGN_OFF,
    ].join('\n'),
  },
  {
    key: 'special-event',
    label: 'Special Event',
    title: 'Special Church Event',
    message: [
      'Dear Church Family,',
      '',
      `You are warmly invited to our special church event on [Date] at [Time], at ${VENUE_LINE}.`,
      '',
      'Bring your family and friends as we celebrate together.',
      '',
      'God bless!',
      '',
      SIGN_OFF,
    ].join('\n'),
  },
  {
    key: 'emergency-update',
    label: 'Emergency Update',
    title: 'Important Church Notice',
    message: [
      'Dear Church Family,',
      '',
      'Please note the following important update:',
      '',
      '[Enter announcement details here]',
      '',
      'Thank you for your understanding.',
      '',
      'God bless you.',
      '',
      SIGN_OFF,
    ].join('\n'),
  },
]
