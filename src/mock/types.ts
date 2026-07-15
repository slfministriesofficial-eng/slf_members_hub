import type { MemberStatus } from '../components/ui/StatusPill'

export type Member = {
  id: string
  memberId: string
  name: string
  initials: string
  color: string
  status: MemberStatus
  statusLabel: string
  ministry: string
  familyCount?: number
  phone: string
  whatsapp: string
  email: string
  joinDate: string
  // Raw yyyy-mm-dd behind the pretty-printed joinDate above — joinDate is display-formatted
  // and can't be parsed back into a date input, so editing needs this instead.
  joiningDateRaw?: string
  spouse?: string
  children?: { name: string; birthdate: string }[]
  anniversary?: string
  present?: boolean

  // Registration-form fields — optional so existing seed members don't need backfilling
  preferredName?: string
  gender?: 'Male' | 'Female'
  dob?: string
  maritalStatus?: 'Single' | 'Married' | 'Widow/Widower'
  bloodGroup?: string
  address?: string
  spouseDob?: string
  spouseMobile?: string
  firstTimeVisiting?: boolean
  previousChurch?: string
  baptized?: boolean
  baptizedDate?: string
  baptizedBy?: string
  believerYears?: string
  ministryInterests?: string[]
  occupation?: string
  occupationOther?: string
  emergencyContactName?: string
  emergencyContactRelationship?: string
  emergencyContactMobile?: string
  registrationDate?: string
}

export type ActivityItem = {
  id: string
  text: string
  time: string
}

export type UpcomingDate = {
  id: string
  day: string
  month: string
  who: string
  what: string
}

export type CareItem = {
  id: string
  who: string
  tagLabel: string
  tagStatus: MemberStatus
  note: string
  due: string
  isDueToday?: boolean
}
