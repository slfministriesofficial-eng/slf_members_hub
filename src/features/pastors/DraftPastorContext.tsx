import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { createEmptyPastorForm, type PastorFormData } from './types'
import { usePastors } from './PastorsContext'

type DraftState = {
  data: PastorFormData
  setField: <K extends keyof PastorFormData>(key: K, value: PastorFormData[K]) => void
  stepIndex: number
  setStepIndex: (value: number | ((prev: number) => number)) => void
  completedKeys: Set<string>
  markCompleted: (key: string) => void
  previewPastorId: string
  resetDraft: () => void
  loadDraft: (form: PastorFormData) => void
}

const DraftCtx = createContext<DraftState | null>(null)

// Mirrors the step keys in AddPastorScreen — loading a saved registration
// should show every section as already filled in.
const ALL_STEP_KEYS = ['personal', 'contact', 'ministry', 'education', 'fellowship', 'review']

/**
 * Holds the in-progress pastor registration outside AddPastorScreen, so
 * navigating away and back doesn't lose anything already typed — the same
 * guarantee the member wizard gives.
 */
export function DraftPastorProvider({ children }: PropsWithChildren) {
  const { pastors, getNextPastorId } = usePastors()
  const [data, setData] = useState<PastorFormData>(createEmptyPastorForm)
  const [stepIndex, setStepIndex] = useState(0)
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set())
  const [previewPastorId, setPreviewPastorId] = useState(getNextPastorId)

  // The register loads asynchronously, so the initial preview above can be
  // computed before it arrives — resync once the list is in (or changes).
  useEffect(() => {
    setPreviewPastorId(getNextPastorId())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastors.length])

  function setField<K extends keyof PastorFormData>(key: K, value: PastorFormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  function markCompleted(key: string) {
    setCompletedKeys((prev) => new Set(prev).add(key))
  }

  function resetDraft() {
    setData(createEmptyPastorForm())
    setStepIndex(0)
    setCompletedKeys(new Set())
    setPreviewPastorId(getNextPastorId())
  }

  function loadDraft(form: PastorFormData) {
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
        previewPastorId,
        resetDraft,
        loadDraft,
      }}
    >
      {children}
    </DraftCtx.Provider>
  )
}

export function useDraftPastor() {
  const ctx = useContext(DraftCtx)
  if (!ctx) throw new Error('useDraftPastor must be used within DraftPastorProvider')
  return ctx
}
