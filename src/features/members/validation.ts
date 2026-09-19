import {
  validateCount,
  validateEmail,
  validateName,
  validatePhone,
} from '../../utils/validation'
import type { MemberFormData } from './types'

/**
 * Format problems in one step of the member wizard, keyed by field name.
 * Only checks the SHAPE of what was typed — whether a field is required at all
 * is the step's own `isValid` gate in AddMemberScreen.
 * @param {string} stepKey which step to check
 * @param {MemberFormData} d the current form
 * @returns {Record<string, string>} field -> message (empty when the step is clean)
 */
export function memberStepErrors(stepKey: string, d: MemberFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  const add = (field: string, message: string | null) => {
    if (message) errors[field] = message
  }

  if (stepKey === 'personal') {
    add('fullName', validateName(d.fullName, 'Full name'))
    add('preferredName', validateName(d.preferredName, 'Preferred name'))
  }

  if (stepKey === 'contact') {
    add('mobile', validatePhone(d.mobile, 'Mobile'))
    add('whatsapp', validatePhone(d.whatsapp, 'WhatsApp number'))
    add('email', validateEmail(d.email))
  }

  if (stepKey === 'family') {
    add('spouseName', validateName(d.spouseName, "Spouse's name"))
    add('spouseMobile', validatePhone(d.spouseMobile, "Spouse's mobile"))
  }

  if (stepKey === 'fellowship') {
    add('believerYears', validateCount(d.believerYears, 'Believer (years)'))
  }

  if (stepKey === 'occupation') {
    add('emergencyName', validateName(d.emergencyName, 'Emergency contact name'))
    add('emergencyMobile', validatePhone(d.emergencyMobile, 'Emergency mobile'))
  }

  return errors
}
