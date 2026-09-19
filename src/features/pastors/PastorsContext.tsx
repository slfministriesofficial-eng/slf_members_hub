import { createContext, useContext, useMemo, type PropsWithChildren } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPastorRecord,
  deletePastorRecord,
  fetchPastors,
  setPastorApprovalRecord,
  updatePastorRecord,
  type PastorRecord,
} from './api'
import type { Pastor, PastorFormData, PastorStatus } from './types'
import { getInitials } from '../../utils/initials'

const PASTORS_QUERY_KEY = ['pastors']

// Same rotation the member directory uses, so the two registers feel like one app.
const AVATAR_COLORS = ['#3F6B4C', '#3E6E8E', '#8A661E', '#B1503F']

function toPastor(record: PastorRecord, index: number): Pastor {
  return {
    ...record,
    id: record.memberId,
    initials: getInitials(record.fullName),
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
  }
}

/** Only the registration fields go to the sheet — status and the approval
 *  stamps are the backend's to set, never the form's. */
function formToPayload(form: PastorFormData): Record<string, unknown> {
  return {
    fullName: form.fullName,
    preferredName: form.preferredName,
    dob: form.dob,
    gender: form.gender,
    maritalStatus: form.maritalStatus,
    // Only married pastors have a spouse on the form — clear it if the status
    // was changed after typing, so a stale name can't survive the edit.
    spouseName: form.maritalStatus === 'Married' ? form.spouseName : '',
    bloodGroup: form.bloodGroup,
    mobile: form.mobile,
    // The tick is the source of truth when set. Otherwise the form marks
    // WhatsApp optional, so fall back to the mobile — "message this pastor"
    // always needs a number to use.
    whatsapp: form.whatsappSameAsMobile ? form.mobile : form.whatsapp || form.mobile,
    email: form.email,
    address: form.address,
    villageTownCity: form.villageTownCity,
    district: form.district,
    state: form.state,
    pinCode: form.pinCode,
    churchName: form.churchName,
    denomination: form.denomination,
    churchAddress: form.churchAddress,
    currentPosition: form.currentPosition,
    yearsOfExperience: form.yearsOfExperience,
    ministryLocation: form.ministryLocation,
    theologicalTraining: form.theologicalTraining,
    institutionName: form.institutionName,
    degreeEarned: form.degreeEarned,
    graduationYear: form.graduationYear,
    otherTraining: form.otherTraining,
    reasonToJoin: form.reasonToJoin,
    howHeard: form.howHeard,
    ref1Name: form.ref1Name,
    ref1Phone: form.ref1Phone,
    ref2Name: form.ref2Name,
    ref2Phone: form.ref2Phone,
    declarationConfirmed: form.declarationConfirmed,
  }
}

type PastorsState = {
  pastors: Pastor[]
  isLoading: boolean
  isError: boolean
  getPastor: (id: string) => Pastor | undefined
  addPastor: (form: PastorFormData) => Promise<Pastor>
  isAdding: boolean
  updatePastor: (memberId: string, form: PastorFormData) => Promise<Pastor>
  isUpdating: boolean
  setApproval: (memberId: string, status: PastorStatus, actor: string) => Promise<Pastor>
  isApproving: boolean
  deletePastor: (memberId: string, reason?: string) => Promise<void>
  isDeleting: boolean
  getNextPastorId: () => string
  refreshPastors: () => Promise<void>
}

const PastorsCtx = createContext<PastorsState | null>(null)

export function PastorsProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()

  const {
    data: records,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: PASTORS_QUERY_KEY,
    queryFn: fetchPastors,
  })

  const pastors = useMemo(() => (records ?? []).map(toPastor), [records])

  const createMutation = useMutation({
    mutationFn: createPastorRecord,
    onSuccess: (record) => {
      queryClient.setQueryData<PastorRecord[]>(PASTORS_QUERY_KEY, (prev) => [...(prev ?? []), record])
    },
  })

  const updateMutation = useMutation({
    mutationFn: updatePastorRecord,
    onSuccess: (record) => {
      queryClient.setQueryData<PastorRecord[]>(PASTORS_QUERY_KEY, (prev) =>
        (prev ?? []).map((r) => (r.memberId === record.memberId ? record : r)),
      )
    },
  })

  const approvalMutation = useMutation({
    mutationFn: ({ memberId, status, actor }: { memberId: string; status: PastorStatus; actor: string }) =>
      setPastorApprovalRecord(memberId, status, actor),
    onSuccess: (record) => {
      queryClient.setQueryData<PastorRecord[]>(PASTORS_QUERY_KEY, (prev) =>
        (prev ?? []).map((r) => (r.memberId === record.memberId ? record : r)),
      )
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ memberId, reason }: { memberId: string; reason?: string }) =>
      deletePastorRecord(memberId, reason),
    onSuccess: (_result, { memberId }) => {
      queryClient.setQueryData<PastorRecord[]>(PASTORS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((r) => r.memberId !== memberId),
      )
    },
  })

  function getPastor(id: string) {
    return pastors.find((p) => p.id === id)
  }

  async function addPastor(form: PastorFormData): Promise<Pastor> {
    const record = await createMutation.mutateAsync(formToPayload(form))
    return toPastor(record, pastors.length)
  }

  async function updatePastor(memberId: string, form: PastorFormData): Promise<Pastor> {
    const record = await updateMutation.mutateAsync({ memberId, ...formToPayload(form) })
    return toPastor(record, 0)
  }

  async function setApproval(memberId: string, status: PastorStatus, actor: string): Promise<Pastor> {
    const record = await approvalMutation.mutateAsync({ memberId, status, actor })
    return toPastor(record, 0)
  }

  async function deletePastor(memberId: string, reason?: string): Promise<void> {
    await deleteMutation.mutateAsync({ memberId, reason })
  }

  /** Preview of the ID the next registration will get — the backend assigns
   *  the real one, this only fills the wizard's header. */
  function getNextPastorId() {
    const nums = pastors
      .map((p) => parseInt(p.memberId.replace(/^SLF-P-/, ''), 10))
      .filter((n) => !Number.isNaN(n))
    const max = nums.length ? Math.max(...nums) : 0
    return `SLF-P-${String(max + 1).padStart(4, '0')}`
  }

  async function refreshPastors() {
    await refetch()
  }

  return (
    <PastorsCtx.Provider
      value={{
        pastors,
        isLoading,
        isError,
        getPastor,
        addPastor,
        isAdding: createMutation.isPending,
        updatePastor,
        isUpdating: updateMutation.isPending,
        setApproval,
        isApproving: approvalMutation.isPending,
        deletePastor,
        isDeleting: deleteMutation.isPending,
        getNextPastorId,
        refreshPastors,
      }}
    >
      {children}
    </PastorsCtx.Provider>
  )
}

export function usePastors() {
  const ctx = useContext(PastorsCtx)
  if (!ctx) throw new Error('usePastors must be used within PastorsProvider')
  return ctx
}
