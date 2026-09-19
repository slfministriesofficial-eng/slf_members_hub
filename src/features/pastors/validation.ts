import {
  validateCount,
  validateEmail,
  validateName,
  validatePhone,
  validatePinCode,
  validateYear,
} from '../../utils/validation'
import type { PastorFormData } from './types'

/**
 * Format problems in one step of the pastor wizard, keyed by field name.
 * Mirrors memberStepErrors: shape only — whether a field is required is the
 * step's own `isValid` gate in AddPastorScreen.
 * @param {string} stepKey which step to check
 * @param {PastorFormData} d the current form
 * @returns {Record<string, string>} field -> message (empty when the step is clean)
 */
export function pastorStepErrors(stepKey: string, d: PastorFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  const add = (field: string, message: string | null) => {
    if (message) errors[field] = message
  }

  if (stepKey === 'personal') {
    add('fullName', validateName(d.fullName, 'Full name'))
    add('preferredName', validateName(d.preferredName, 'Preferred name'))
    add('spouseName', validateName(d.spouseName, 'Spouse name'))
  }

  if (stepKey === 'contact') {
    add('mobile', validatePhone(d.mobile, 'Mobile'))
    add('whatsapp', validatePhone(d.whatsapp, 'WhatsApp number'))
    add('email', validateEmail(d.email, 'Email ID'))
    add('pinCode', validatePinCode(d.pinCode))
  }

  if (stepKey === 'ministry') {
    add('yearsOfExperience', validateCount(d.yearsOfExperience, 'Years of ministry experience', 80))
  }

  if (stepKey === 'education') {
    add('graduationYear', validateYear(d.graduationYear, 'Year of graduation'))
  }

  if (stepKey === 'fellowship') {
    add('ref1Name', validateName(d.ref1Name, 'Reference 1 name'))
    add('ref1Phone', validatePhone(d.ref1Phone, 'Reference 1 contact'))
    add('ref2Name', validateName(d.ref2Name, 'Reference 2 name'))
    add('ref2Phone', validatePhone(d.ref2Phone, 'Reference 2 contact'))
  }

  return errors
}
