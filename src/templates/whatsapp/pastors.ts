import { calculateAge } from '../../utils/celebrations'
import type { Pastor } from '../../features/pastors/types'
import { sanitizeWhatsappMessage } from './index'

/** Titles a register entry might already carry, so we never end up with
 *  "Pastor Pastor Samuel" or "Pastor Rev. John". */
const TITLE_PREFIX = /^(pastor|pas\.?|ps\.?|pr\.?|rev\.?|reverend|bishop|bro\.?|dr\.?)\s/i

/**
 * How a pastor is addressed in a message — their full name, prefixed with
 * "Pastor" only when the name doesn't already carry a title of its own.
 * @param {Pastor} pastor the register entry
 * @returns {string} the name to greet them by
 */
export function pastorDisplayName(pastor: Pastor): string {
  const name = pastor.fullName.trim()
  if (!name) return 'Pastor'
  return TITLE_PREFIX.test(name) ? name : `Pastor ${name}`
}

export type PastorBirthdayTemplateKey = 'blessing' | 'prayer' | 'greeting'

export const PASTOR_BIRTHDAY_TEMPLATES: { key: PastorBirthdayTemplateKey; label: string }[] = [
  { key: 'blessing', label: 'Blessing' },
  { key: 'prayer', label: 'Prayer' },
  { key: 'greeting', label: 'Short Greeting' },
]

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  if (n % 10 === 1) return `${n}st`
  if (n % 10 === 2) return `${n}nd`
  if (n % 10 === 3) return `${n}rd`
  return `${n}th`
}

/**
 * Birthday greeting for a fellowship pastor. Same voice as the member
 * greetings, but addressed to a fellow minister rather than a church member.
 * The age is omitted entirely when no date of birth is on file, rather than
 * guessing a number.
 * @param {PastorBirthdayTemplateKey} key which wording to use
 * @param {Pastor} pastor the recipient
 * @returns {string} the WhatsApp message
 */
export function buildPastorBirthdayMessage(key: PastorBirthdayTemplateKey, pastor: Pastor): string {
  const name = pastorDisplayName(pastor)
  const age = calculateAge(pastor.dob)
  const nth = age !== null ? `${ordinal(age)} ` : ''

  if (key === 'prayer') {
    return sanitizeWhatsappMessage(
      [
        `🙏 Happy ${nth}Birthday, ${name}!`,
        '',
        'On your special day we lift you up in prayer, asking God to strengthen you in your ministry and to fill this new year with His presence, provision, and perfect peace.',
        '',
        'May the Lord continue to use you mightily for His kingdom.',
        '',
        'With prayers,',
        '*SLF Ministries Pastors Fellowship*',
        'Vijayawada',
      ].join('\n'),
    )
  }

  if (key === 'greeting') {
    return sanitizeWhatsappMessage(
      [
        `🎂 Happy ${nth}Birthday, ${name}!`,
        '',
        "Wishing you a joyful day and God's abundant blessings on you, your family, and your ministry.",
        '',
        'With love,',
        '*SLF Ministries Pastors Fellowship*',
        'Vijayawada',
      ].join('\n'),
    )
  }

  return sanitizeWhatsappMessage(
    [
      `🎉 Happy ${nth}Birthday, ${name}!`,
      '',
      'May our Lord Jesus Christ bless you with good health, wisdom, peace, and abundant grace throughout the coming year.',
      '',
      'We thank God for your faithful service and for your fellowship with us.',
      '',
      'May God richly bless you, your family, and the work of your hands.',
      '',
      'With love and prayers,',
      '*SLF Ministries Pastors Fellowship*',
      'Vijayawada',
    ].join('\n'),
  )
}
