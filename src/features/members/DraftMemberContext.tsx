import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { createEmptyMemberForm, type MemberFormData } from './types'
import { useMembers } from './MembersContext'

type DraftState = {
  data: MemberFormData
  setField: <K extends keyof MemberFormData>(key: K, value: MemberFormData[K]) => void
  stepIndex: number
  setStepIndex: (value: number | ((prev: number) => number)) => void
  completedKeys: Set<string>
  markCompleted: (key: string) => void
  previewMemberId: string
  resetDraft: () => void
  loadDraft: (form: MemberFormData) => void
}

const DraftCtx = createContext<DraftState | null>(null)

// Matches the step keys defined in AddMemberScreen — kept here too since loading an
// existing member's draft should show every section as already filled in.
const ALL_STEP_KEYS = ['personal', 'contact', 'family', 'fellowship', 'ministry', 'occupation', 'review']

// Holds the in-progress registration form outside AddMemberScreen itself, so
// navigating away (e.g. to preview the ID card on its own page) and back
// doesn't lose anything the admin has already typed in.
export function DraftMemberProvider({ children }: PropsWithChildren) {
  const { members, getNextMemberId } = useMembers()
  const [data, setData] = useState<MemberFormData>(createEmptyMemberForm)
  const [stepIndex, setStepIndex] = useState(0)
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set())
  const [previewMemberId, setPreviewMemberId] = useState(getNextMemberId)

  // The real member list loads asynchronously now, so the initial preview computed
  // above may run before it arrives — resync once the list is in (or changes).
  useEffect(() => {
    setPreviewMemberId(getNextMemberId())
  }, [members.length])

  function setField<K extends keyof MemberFormData>(key: K, value: MemberFormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  function markCompleted(key: string) {
    setCompletedKeys((prev) => new Set(prev).add(key))
  }

  function resetDraft() {
    setData(createEmptyMemberForm())
    setStepIndex(0)
    setCompletedKeys(new Set())
    setPreviewMemberId(getNextMemberId())
  }

  function loadDraft(form: MemberFormData) {
    setData(form)
    setStepIndex(0)
    setCompletedKeys(new Set(ALL_STEP_KEYS))
  }

  return (
    <DraftCtx.Provider
      value={{
        data,
        setField,
        stepIndex,
        setStepIndex,
        completedKeys,
        markCompleted,
        previewMemberId,
        resetDraft,
        loadDraft,
      }}
    >
      {children}
    </DraftCtx.Provider>
  )
}

export function useDraftMember() {
  const ctx = useContext(DraftCtx)
  if (!ctx) throw new Error('useDraftMember must be used within DraftMemberProvider')
  return ctx
}
