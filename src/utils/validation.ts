/**
 * Field validators shared by the member and pastor registration wizards.
 *
 * Two layers, because they catch different mistakes:
 *  - `keepDigits` is wired into the input itself, so letters can never be typed
 *    into a phone or PIN box in the first place (the original bug: "sdf" saved
 *    happily as a mobile number).
 *  - the `validate*` helpers run when the step is submitted and catch what
 *    digits-only can't — a number that is too short, a malformed email, a
 *    graduation year in the future.
 *
 * Every validator returns an error message, or null when the value is fine.
 * Empty values always pass: "required" is the step's own gate, so an optional
 * field left blank is never an error here.
 */

/** Strip everything that isn't a digit — for phone, PIN and year inputs. */
export function keepDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Digits plus the separators a typed phone number legitimately contains. */
export function keepPhoneChars(value: string): string {
  return value.replace(/[^\d+\-\s]/g, '')
}

/**
 * Indian mobile numbers are 10 digits. A leading +91, 91 or 0 is accepted and
 * ignored, since that is how people write them down.
 * @param {string} value raw input
 * @param {string} [label] what to call the field in the message
 * @returns {string | null} error message, or null when valid
 */
export function validatePhone(value: string, label = 'Mobile number'): string | null {
  const raw = value.trim()
  if (!raw) return null
  let digits = keepDigits(raw)
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
  if (digits.length !== 10) {
    return `${label} must be 10 digits (you entered ${digits.length || 0}).`
  }
  return null
}

/** Deliberately permissive — enough to catch a typo, not to police the RFC. */
export function validateEmail(value: string, label = 'Email'): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw)) {
    return `${label} doesn't look like a valid address.`
  }
  return null
}

/** Indian PIN codes are exactly 6 digits. */
export function validatePinCode(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (!/^\d{6}$/.test(raw)) return 'PIN code must be 6 digits.'
  return null
}

/**
 * A four-digit year that isn't in the future and isn't absurdly old.
 * @param {string} value raw input
 * @param {string} label what to call the field in the message
 */
export function validateYear(value: string, label = 'Year'): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (!/^\d{4}$/.test(raw)) return `${label} must be a 4-digit year.`
  const year = Number(raw)
  const thisYear = new Date().getFullYear()
  if (year > thisYear) return `${label} can't be in the future.`
  if (year < 1900) return `${label} looks too far in the past.`
  return null
}

/**
 * A plain count — years of experience, years a believer.
 * @param {string} value raw input
 * @param {string} label what to call the field in the message
 * @param {number} [max] largest sensible value
 */
export function validateCount(value: string, label: string, max = 100): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (!/^\d+$/.test(raw)) return `${label} must be a number.`
  if (Number(raw) > max) return `${label} must be ${max} or less.`
  return null
}

/**
 * Names shouldn't contain digits — a stray "9" is almost always a phone
 * number pasted into the wrong box.
 */
export function validateName(value: string, label = 'Name'): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (/\d/.test(raw)) return `${label} shouldn't contain numbers.`
  return null
}

/** The first error in a field->message map, for the toast. */
export function firstError(errors: Record<string, string>): string | null {
  const keys = Object.keys(errors)
  return keys.length > 0 ? errors[keys[0]] : null
}
