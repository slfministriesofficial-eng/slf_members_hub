import type { Member } from '../../mock/types'

export type ChildDraft = {
  name: string
  dob: string
}

export type MemberFormData = {
  // Step 1 — Personal
  fullName: string
  preferredName: string
  gender: 'Male' | 'Female' | ''
  dob: string
  maritalStatus: 'Single' | 'Married' | 'Widow/Widower' | ''
  marriageDay: string
  bloodGroup: string

  // Step 2 — Contact & Address
  mobile: string
  whatsapp: string
  email: string
  address: string

  // Step 3 — Family (shown if Married)
  spouseName: string
  spouseDob: string
  spouseMobile: string
  children: ChildDraft[]

  // Step 4 — Fellowship
  firstTimeVisiting: 'Yes' | 'No' | ''
  previousChurch: string
  joiningDate: string
  baptized: 'Yes' | 'No' | ''
  baptizedDate: string
  baptizedBy: string
  believerYears: string

  // Step 5 — Ministry
  ministryInterests: string[]

  // Step 6 — Occupation & Emergency
  occupation: string
  occupationOther: string
  emergencyName: string
  emergencyRelationship: string
  emergencyMobile: string

  // Step 7 — Review
  declarationConfirmed: boolean
}

export function createEmptyMemberForm(): MemberFormData {
  return {
    fullName: '',
    preferredName: '',
    gender: '',
    dob: '',
    maritalStatus: '',
    marriageDay: '',
    bloodGroup: '',
    mobile: '',
    whatsapp: '',
    email: '',
    address: '',
    spouseName: '',
    spouseDob: '',
    spouseMobile: '',
    children: [],
    firstTimeVisiting: '',
    previousChurch: '',
    joiningDate: '',
    baptized: '',
    baptizedDate: '',
    baptizedBy: '',
    believerYears: '',
    ministryInterests: [],
    occupation: '',
    occupationOther: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyMobile: '',
    declarationConfirmed: false,
  }
}

// Reverse of what MembersContext derives for display — used to pre-fill the
// registration wizard when editing an existing member.
export function memberToFormData(member: Member): MemberFormData {
  return {
    fullName: member.name,
    preferredName: member.preferredName ?? '',
    gender: member.gender ?? '',
    dob: member.dob ?? '',
    maritalStatus: member.maritalStatus ?? '',
    marriageDay: member.anniversary ?? '',
    bloodGroup: member.bloodGroup ?? '',
    mobile: member.phone,
    whatsapp: member.whatsapp,
    email: member.email,
    address: member.address ?? '',
    spouseName: member.spouse ?? '',
    spouseDob: member.spouseDob ?? '',
    spouseMobile: member.spouseMobile ?? '',
    children: member.children?.map((c) => ({ name: c.name, dob: c.birthdate })) ?? [],
    firstTimeVisiting: member.firstTimeVisiting === undefined ? '' : member.firstTimeVisiting ? 'Yes' : 'No',
    previousChurch: member.previousChurch ?? '',
    joiningDate: member.joiningDateRaw ?? '',
    baptized: member.baptized === undefined ? '' : member.baptized ? 'Yes' : 'No',
    baptizedDate: member.baptizedDate ?? '',
    baptizedBy: member.baptizedBy ?? '',
    believerYears: member.believerYears ?? '',
    ministryInterests: member.ministryInterests ?? [],
    occupation: member.occupation ?? '',
    // The sheet merges "Other Information" into the one Occupation column on save,
    // so it can't be split back out on edit — it lands back in the Occupation field.
    occupationOther: '',
    emergencyName: member.emergencyContactName ?? '',
    emergencyRelationship: member.emergencyContactRelationship ?? '',
    emergencyMobile: member.emergencyContactMobile ?? '',
    declarationConfirmed: true,
  }
}

export type StepProps = {
  data: MemberFormData
  setField: <K extends keyof MemberFormData>(key: K, value: MemberFormData[K]) => void
}

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

export const MINISTRY_OPTIONS = [
  'Choir',
  'Prayer Team',
  'Media Support',
  'Editing',
  'Youth Ministry',
  'Transport Ministry',
]
