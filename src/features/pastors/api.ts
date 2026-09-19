// Raw shape returned by the Google Apps Script Web App — one field per column
// on the "Pastors" sheet, using the same camelCase names the wizard sends
// (see apps-script/Code.gs PASTOR_FIELD_MAP).
export type PastorRecord = {
  memberId: string
  registrationDate: string
  fullName: string
  preferredName: string
  dob: string
  gender: string
  maritalStatus: string
  spouseName: string
  bloodGroup: string
  mobile: string
  whatsapp: string
  email: string
  address: string
  villageTownCity: string
  district: string
  state: string
  pinCode: string
  churchName: string
  denomination: string
  churchAddress: string
  currentPosition: string
  yearsOfExperience: string
  ministryLocation: string
  theologicalTraining: string
  institutionName: string
  degreeEarned: string
  graduationYear: string
  otherTraining: string
  reasonToJoin: string
  howHeard: string
  ref1Name: string
  ref1Phone: string
  ref2Name: string
  ref2Phone: string
  declarationConfirmed: boolean
  // Office use — set from the profile page, never by the registration form.
  status: string
  verifiedBy: string
  verificationDate: string
  approvedBy: string
  approvalDate: string
}

const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string

/**
 * Every pastor in the fellowship register.
 * Validates the shape, because an Apps Script deployment without the pastors
 * endpoint answers this URL with the MEMBER roster instead — that has to
 * surface as an error rather than quietly filling the page with members.
 * @returns {Promise<PastorRecord[]>} the register
 */
export async function fetchPastors(): Promise<PastorRecord[]> {
  const res = await fetch(`${BASE_URL}?pastors=list`)
  if (!res.ok) throw new Error('Failed to load pastors')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  if (!Array.isArray(data)) throw new Error('Pastors endpoint not available — deploy the latest Apps Script version')
  if (data.length > 0 && !('churchName' in data[0])) {
    throw new Error('Pastors endpoint not available — deploy the latest Apps Script version')
  }
  return data as PastorRecord[]
}

export async function createPastorRecord(fields: Record<string, unknown>): Promise<PastorRecord> {
  return postAction<PastorRecord>({ action: 'createPastor', ...fields })
}

export async function updatePastorRecord(
  fields: Record<string, unknown> & { memberId: string },
): Promise<PastorRecord> {
  return postAction<PastorRecord>({ action: 'updatePastor', ...fields })
}

export async function deletePastorRecord(memberId: string, reason?: string): Promise<{ deleted: string }> {
  // The full row is archived to the "Deleted Pastors" sheet with this reason
  // before it is removed, so a mistaken delete is always recoverable.
  return postAction<{ deleted: string }>({ action: 'deletePastor', memberId, reason: reason ?? '' })
}

/**
 * Move a registration through the office sign-off (section 9 of the form).
 * @param {string} memberId the pastor to stamp
 * @param {'Pending' | 'Verified' | 'Approved'} status the stage being set
 * @param {string} actor who is signing off — recorded in the sheet
 */
export async function setPastorApprovalRecord(
  memberId: string,
  status: 'Pending' | 'Verified' | 'Approved',
  actor: string,
): Promise<PastorRecord> {
  return postAction<PastorRecord>({ action: 'setPastorApproval', memberId, status, actor })
}

// Apps Script Web Apps reject a JSON Content-Type with a CORS preflight —
// sending as text/plain avoids that; the script still parses the body as JSON.
async function postAction<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Request failed')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return data as T
}
