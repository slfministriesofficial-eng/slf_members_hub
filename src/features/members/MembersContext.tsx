import { createContext, useContext, useMemo, type PropsWithChildren } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Member } from '../../mock/types'
import type { MemberFormData } from './types'
import {
  createMemberRecord,
  deleteMemberRecord,
  fetchMembers,
  updateMemberRecord,
  type MemberRecord,
} from './api'
import { getInitials } from '../../utils/initials'

const MEMBERS_QUERY_KEY = ['members']

const AVATAR_COLORS = ['#3F6B4C', '#3E6E8E', '#8A661E', '#B1503F']

function formatJoinDate(input: string): string {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  const day = d.getDate()
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

function nextMemberId(members: Member[]): string {
  const nums = members
    .map((m) => parseInt(m.memberId.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return `SLF-${String(max + 1).padStart(4, '0')}`
}

// Converts a raw sheet record into the shape every screen renders (avatar
// color, status pill, etc.) — the same derivation addMember used to do locally.
function toMember(record: MemberRecord, index: number): Member {
  const isVisitor = record.firstTimeVisiting === 'Yes'
  const familyCount = (record.spouseName ? 1 : 0) + record.children.length
  const joinSource = record.joiningDate || record.registrationDate

  return {
    id: record.memberId,
    memberId: record.memberId,
    name: record.fullName,
    initials: getInitials(record.fullName),
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
    status: isVisitor ? 'visitor' : 'regular',
    statusLabel: isVisitor ? 'Visitor' : 'Member',
    ministry: record.ministryInterests[0] ?? '—',
    familyCount: familyCount > 0 ? familyCount : undefined,
    phone: record.mobile,
    whatsapp: record.whatsapp || record.mobile,
    email: record.email,
    joinDate: joinSource ? formatJoinDate(joinSource) : '—',
    joiningDateRaw: record.joiningDate || undefined,
    spouse: record.spouseName || undefined,
    children: record.children.length
      ? record.children.map((c) => ({ name: c.name, birthdate: c.dob }))
      : undefined,
    anniversary: record.marriageDay || undefined,

    preferredName: record.preferredName || undefined,
    gender: (record.gender as Member['gender']) || undefined,
    dob: record.dob || undefined,
    maritalStatus: (record.maritalStatus as Member['maritalStatus']) || undefined,
    bloodGroup: record.bloodGroup || undefined,
    address: record.address || undefined,
    spouseDob: record.spouseDob || undefined,
    spouseMobile: record.spouseMobile || undefined,
    firstTimeVisiting: isVisitor,
    previousChurch: record.previousChurch || undefined,
    baptized: record.baptized === 'Yes',
    baptizedDate: record.baptizedDate || undefined,
    baptizedBy: record.baptizedBy || undefined,
    believerYears: record.believerYears || undefined,
    ministryInterests: record.ministryInterests.length ? record.ministryInterests : undefined,
    occupation: record.occupation || undefined,
    emergencyContactName: record.emergencyName || undefined,
    emergencyContactRelationship: record.emergencyRelationship || undefined,
    emergencyContactMobile: record.emergencyMobile || undefined,
    registrationDate: record.registrationDate || undefined,
  }
}

function formToPayload(form: MemberFormData): Record<string, unknown> {
  return {
    fullName: form.fullName,
    preferredName: form.preferredName,
    gender: form.gender,
    dob: form.dob,
    maritalStatus: form.maritalStatus,
    marriageDay: form.marriageDay,
    bloodGroup: form.bloodGroup,
    mobile: form.mobile,
    whatsapp: form.whatsapp,
    email: form.email,
    address: form.address,
    spouseName: form.spouseName,
    spouseDob: form.spouseDob,
    spouseMobile: form.spouseMobile,
    children: form.children,
    firstTimeVisiting: form.firstTimeVisiting,
    previousChurch: form.previousChurch,
    joiningDate: form.joiningDate,
    baptized: form.baptized,
    baptizedDate: form.baptizedDate,
    baptizedBy: form.baptizedBy,
    believerYears: form.believerYears,
    ministryInterests: form.ministryInterests,
    // The sheet has one Occupation column — fold the "Other Information" note into it
    // rather than dropping it, since there's no separate column for it.
    occupation: [form.occupation, form.occupationOther].filter(Boolean).join(' — '),
    emergencyName: form.emergencyName,
    emergencyRelationship: form.emergencyRelationship,
    emergencyMobile: form.emergencyMobile,
    declarationConfirmed: form.declarationConfirmed,
  }
}

type MembersState = {
  members: Member[]
  isLoading: boolean
  isError: boolean
  getMember: (id: string) => Member | undefined
  addMember: (form: MemberFormData) => Promise<Member>
  isAdding: boolean
  updateMember: (memberId: string, form: MemberFormData) => Promise<Member>
  isUpdating: boolean
  deleteMember: (memberId: string) => Promise<void>
  isDeleting: boolean
  getNextMemberId: () => string
  refreshMembers: () => Promise<void>
}

const MembersCtx = createContext<MembersState | null>(null)

export function MembersProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()

  const {
    data: records,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: MEMBERS_QUERY_KEY,
    queryFn: fetchMembers,
  })

  const members = useMemo(() => (records ?? []).map(toMember), [records])

  const createMutation = useMutation({
    mutationFn: createMemberRecord,
    onSuccess: (record) => {
      queryClient.setQueryData<MemberRecord[]>(MEMBERS_QUERY_KEY, (prev) => [...(prev ?? []), record])
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateMemberRecord,
    onSuccess: (record) => {
      queryClient.setQueryData<MemberRecord[]>(MEMBERS_QUERY_KEY, (prev) =>
        (prev ?? []).map((r) => (r.memberId === record.memberId ? record : r)),
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMemberRecord,
    onSuccess: (_result, memberId) => {
      queryClient.setQueryData<MemberRecord[]>(MEMBERS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((r) => r.memberId !== memberId),
      )
    },
  })

  function getMember(id: string) {
    return members.find((m) => m.id === id)
  }

  async function addMember(form: MemberFormData): Promise<Member> {
    const record = await createMutation.mutateAsync(formToPayload(form))
    return toMember(record, members.length)
  }

  async function updateMember(memberId: string, form: MemberFormData): Promise<Member> {
    const record = await updateMutation.mutateAsync({ memberId, ...formToPayload(form) })
    return toMember(record, 0)
  }

  async function deleteMember(memberId: string): Promise<void> {
    await deleteMutation.mutateAsync(memberId)
  }

  function getNextMemberId() {
    return nextMemberId(members)
  }

  async function refreshMembers() {
    await refetch()
  }

  return (
    <MembersCtx.Provider
      value={{
        members,
        isLoading,
        isError,
        getMember,
        addMember,
        isAdding: createMutation.isPending,
        updateMember,
        isUpdating: updateMutation.isPending,
        deleteMember,
        isDeleting: deleteMutation.isPending,
        getNextMemberId,
        refreshMembers,
      }}
    >
      {children}
    </MembersCtx.Provider>
  )
}

export function useMembers() {
  const ctx = useContext(MembersCtx)
  if (!ctx) throw new Error('useMembers must be used within MembersProvider')
  return ctx
}
