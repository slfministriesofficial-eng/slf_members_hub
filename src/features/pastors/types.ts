import type { PastorRecord } from './api'

/** Where a registration sits in the office's sign-off flow (section 9 of the
 *  paper form). Every new registration starts at "Pending". */
export type PastorStatus = 'Pending' | 'Verified' | 'Approved'

/**
 * A pastor as the screens render them — the raw sheet record plus the few
 * derived bits every list/profile needs (avatar initials and colour).
 * Deliberately a thin wrapper: unlike members, nothing here needs reshaping.
 */
export type Pastor = PastorRecord & {
  id: string
  initials: string
  color: string
}

/** The registration form itself. The office columns (status, verifiedBy, …)
 *  are NOT here — they are set from the profile page after registration, never
 *  typed into the form. */
export type PastorFormData = {
  // 1 — Personal
  fullName: string
  preferredName: string
  dob: string
  gender: 'Male' | 'Female' | ''
  maritalStatus: 'Single' | 'Married' | 'Widowed' | ''
  spouseName: string
  bloodGroup: string

  // 2 — Contact
  mobile: string
  whatsapp: string
  email: string

  // 3 — Residential address
  address: string
  villageTownCity: string
  district: string
  state: string
  pinCode: string

  // 4 — Church & ministry
  churchName: string
  denomination: string
  churchAddress: string
  currentPosition: string
  yearsOfExperience: string
  ministryLocation: string

  // 5 — Theological education & training
  theologicalTraining: string
  institutionName: string
  degreeEarned: string
  graduationYear: string
  otherTraining: string

  // 6 — Fellowship
  reasonToJoin: string
  howHeard: string

  // 7 — References
  ref1Name: string
  ref1Phone: string
  ref2Name: string
  ref2Phone: string

  // 8 — Declaration (lives on the Review step)
  declarationConfirmed: boolean
}

export function createEmptyPastorForm(): PastorFormData {
  return {
    fullName: '',
    preferredName: '',
    dob: '',
    gender: '',
    maritalStatus: '',
    spouseName: '',
    bloodGroup: '',
    mobile: '',
    whatsapp: '',
    email: '',
    address: '',
    villageTownCity: '',
    district: '',
    state: '',
    pinCode: '',
    churchName: '',
    denomination: '',
    churchAddress: '',
    currentPosition: '',
    yearsOfExperience: '',
    ministryLocation: '',
    theologicalTraining: '',
    institutionName: '',
    degreeEarned: '',
    graduationYear: '',
    otherTraining: '',
    reasonToJoin: '',
    howHeard: '',
    ref1Name: '',
    ref1Phone: '',
    ref2Name: '',
    ref2Phone: '',
    declarationConfirmed: false,
  }
}

/** Pre-fill the wizard from a saved pastor when editing. */
export function pastorToFormData(pastor: Pastor): PastorFormData {
  return {
    fullName: pastor.fullName,
    preferredName: pastor.preferredName,
    dob: pastor.dob,
    gender: (pastor.gender as PastorFormData['gender']) || '',
    maritalStatus: (pastor.maritalStatus as PastorFormData['maritalStatus']) || '',
    spouseName: pastor.spouseName,
    bloodGroup: pastor.bloodGroup,
    mobile: pastor.mobile,
    whatsapp: pastor.whatsapp,
    email: pastor.email,
    address: pastor.address,
    villageTownCity: pastor.villageTownCity,
    district: pastor.district,
    state: pastor.state,
    pinCode: pastor.pinCode,
    churchName: pastor.churchName,
    denomination: pastor.denomination,
    churchAddress: pastor.churchAddress,
    currentPosition: pastor.currentPosition,
    yearsOfExperience: pastor.yearsOfExperience,
    ministryLocation: pastor.ministryLocation,
    theologicalTraining: pastor.theologicalTraining,
    institutionName: pastor.institutionName,
    degreeEarned: pastor.degreeEarned,
    graduationYear: pastor.graduationYear,
    otherTraining: pastor.otherTraining,
    reasonToJoin: pastor.reasonToJoin,
    howHeard: pastor.howHeard,
    ref1Name: pastor.ref1Name,
    ref1Phone: pastor.ref1Phone,
    ref2Name: pastor.ref2Name,
    ref2Phone: pastor.ref2Phone,
    // Already on file — the signed paper form is what the tick attests to.
    declarationConfirmed: true,
  }
}

export type PastorStepProps = {
  data: PastorFormData
  setField: <K extends keyof PastorFormData>(key: K, value: PastorFormData[K]) => void
}

/** Section 9 statuses mapped onto the existing StatusPill palette — no new
 *  theme tokens: Pending reads amber, Verified blue, Approved green. */
export const PASTOR_STATUS_TONE: Record<PastorStatus, 'leader' | 'visitor' | 'regular'> = {
  Pending: 'leader',
  Verified: 'visitor',
  Approved: 'regular',
}
