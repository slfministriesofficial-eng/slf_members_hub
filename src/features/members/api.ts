// Raw shape returned by the Google Apps Script Web App — one field per sheet
// column, using the same camelCase names as MemberFormData (see apps-script/Code.gs FIELD_MAP).
export type MemberRecord = {
  memberId: string
  registrationDate: string
  joiningDate: string
  fullName: string
  preferredName: string
  gender: string
  dob: string
  maritalStatus: string
  marriageDay: string
  bloodGroup: string
  mobile: string
  whatsapp: string
  email: string
  address: string
  emergencyName: string
  emergencyMobile: string
  emergencyRelationship: string
  occupation: string
  firstTimeVisiting: string
  previousChurch: string
  baptized: string
  baptizedDate: string
  baptizedBy: string
  believerYears: string
  ministryInterests: string[]
  familyId: string
  spouseName: string
  spouseDob: string
  spouseMobile: string
  children: { name: string; dob: string }[]
  declarationConfirmed: boolean
}

// Subset returned for public (QR-scan) requests — see Code.gs PUBLIC_SAFE_FIELDS.
// No phone, email, address, or emergency/spouse/children info is ever included.
export type PublicMemberRecord = {
  memberId: string
  fullName: string
  joiningDate: string
  registrationDate: string
  ministryInterests: string[]
  believerYears: string
  baptized: string
  baptizedDate: string
  bloodGroup: string
  firstTimeVisiting: string
}

const BASE_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string

export async function fetchMembers(): Promise<MemberRecord[]> {
  const res = await fetch(BASE_URL)
  if (!res.ok) throw new Error('Failed to load members')
  return res.json()
}

// Used by the public digital-profile page — the server strips sensitive fields
// before this response ever leaves Google's servers (not just a UI-level filter).
export async function fetchMemberPublic(memberId: string): Promise<PublicMemberRecord | null> {
  const res = await fetch(`${BASE_URL}?id=${encodeURIComponent(memberId)}&public=1`)
  if (!res.ok) throw new Error('Failed to load member')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return data
}

export async function createMemberRecord(fields: Record<string, unknown>): Promise<MemberRecord> {
  return postAction<MemberRecord>({ action: 'create', ...fields })
}

export async function updateMemberRecord(
  fields: Record<string, unknown> & { memberId: string },
): Promise<MemberRecord> {
  return postAction<MemberRecord>({ action: 'update', ...fields })
}

export async function deleteMemberRecord(memberId: string): Promise<{ deleted: string }> {
  return postAction<{ deleted: string }>({ action: 'delete', memberId })
}

// Apps Script Web Apps reject a JSON Content-Type with a CORS preflight —
// sending as text/plain avoids that; the script still parses e.postData.contents as JSON.
async function postAction<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Request failed')
  const data = await res.json()
  if (data && data.error) throw new Error(data.error)
  return data
}
