import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { memberToFormData, type MemberFormData } from '../features/members/types'
import { useMembers } from '../features/members/MembersContext'
import { useDraftMember } from '../features/members/DraftMemberContext'
import { StepSidebar } from '../features/members/StepSidebar'
import { PersonalStep } from '../features/members/steps/PersonalStep'
import { ContactStep } from '../features/members/steps/ContactStep'
import { FamilyStep } from '../features/members/steps/FamilyStep'
import { FellowshipStep } from '../features/members/steps/FellowshipStep'
import { MinistryStep } from '../features/members/steps/MinistryStep'
import { OccupationEmergencyStep } from '../features/members/steps/OccupationEmergencyStep'
import { ReviewStep } from '../features/members/steps/ReviewStep'

type StepDef = {
  key: string
  title: string
  seconds: number
  isRelevant?: (data: MemberFormData) => boolean
  isValid: (data: MemberFormData) => boolean
}

export function AddMemberScreen() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id
  const { addMember, updateMember, isAdding, isUpdating, getMember } = useMembers()
  const { data, setField, stepIndex, setStepIndex, completedKeys, markCompleted, resetDraft, loadDraft } =
    useDraftMember()
  const [saveError, setSaveError] = useState<string | null>(null)
  const isSaving = isAdding || isUpdating

  // Pre-fill the wizard from the existing member when editing — guarded so it only
  // runs once per id, since members/getMember change reference on every render.
  const loadedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!id || loadedForRef.current === id) return
    const member = getMember(id)
    if (member) {
      loadDraft(memberToFormData(member))
      loadedForRef.current = id
    }
  }, [id, getMember, loadDraft])

  const allSteps: StepDef[] = useMemo(
    () => [
      {
        key: 'personal',
        title: 'Personal Information',
        seconds: 20,
        isValid: (d: MemberFormData) => !!d.fullName && !!d.gender && !!d.dob && !!d.maritalStatus,
      },
      {
        key: 'contact',
        title: 'Contact & Address',
        seconds: 15,
        isValid: (d: MemberFormData) => !!d.mobile && !!d.address,
      },
      {
        key: 'family',
        title: 'Family Information',
        seconds: 15,
        isValid: (_d: MemberFormData) => true,
      },
      {
        key: 'fellowship',
        title: 'Fellowship Details',
        seconds: 15,
        isValid: (d: MemberFormData) => !!d.firstTimeVisiting && !!d.baptized,
      },
      {
        key: 'ministry',
        title: 'Ministry Interest',
        seconds: 10,
        isValid: (_d: MemberFormData) => true,
      },
      {
        key: 'occupation',
        title: 'Occupation & Emergency Contact',
        seconds: 15,
        isValid: (d: MemberFormData) => !!d.emergencyName && !!d.emergencyMobile,
      },
      {
        key: 'review',
        title: 'Review & Save',
        seconds: 10,
        isValid: (d: MemberFormData) => d.declarationConfirmed,
      },
    ],
    [],
  )

  // All 7 steps are part of the flow now — kept as a filter (rather than a plain alias)
  // so a step can still opt out via isRelevant in the future without other logic changing.
  const steps = useMemo(
    () => allSteps.filter((s) => !s.isRelevant || s.isRelevant(data)),
    [allSteps, data],
  )
  const current = steps[stepIndex] ?? steps[0]
  const isLast = stepIndex === steps.length - 1
  const canProceed = current.isValid(data)
  const progress = ((stepIndex + 1) / steps.length) * 100

  const sidebarSteps = useMemo(() => {
    return allSteps.map((s) => {
      const relevant = !s.isRelevant || s.isRelevant(data)
      if (!relevant) {
        return { key: s.key, title: s.title, state: 'skipped' as const }
      }
      const state: 'done' | 'current' | 'upcoming' = completedKeys.has(s.key)
        ? 'done'
        : s.key === current.key
          ? 'current'
          : 'upcoming'
      return { key: s.key, title: s.title, state }
    })
  }, [allSteps, data, completedKeys, current.key])

  async function goNext() {
    if (!canProceed) return
    if (isLast) {
      setSaveError(null)
      try {
        if (isEditMode && id) {
          await updateMember(id, data)
          resetDraft()
          navigate(`/members/${id}`)
        } else {
          const member = await addMember(data)
          resetDraft()
          navigate(`/members/${member.id}`)
        }
      } catch {
        setSaveError(
          isEditMode
            ? 'Could not save changes — check your connection and try again.'
            : 'Could not save this member — check your connection and try again.',
        )
      }
      return
    }
    markCompleted(current.key)
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }

  function goBack() {
    if (stepIndex === 0) {
      navigate(isEditMode ? `/members/${id}` : '/members')
      return
    }
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  // Free navigation — any relevant step is switchable from the sidebar at any time,
  // regardless of what's been filled in yet.
  function goToStep(key: string) {
    const idx = steps.findIndex((s) => s.key === key)
    if (idx !== -1) {
      setStepIndex(idx)
    }
  }

  function renderStep() {
    switch (current.key) {
      case 'personal':
        return <PersonalStep data={data} setField={setField} />
      case 'contact':
        return <ContactStep data={data} setField={setField} />
      case 'family':
        return <FamilyStep data={data} setField={setField} />
      case 'fellowship':
        return <FellowshipStep data={data} setField={setField} />
      case 'ministry':
        return <MinistryStep data={data} setField={setField} />
      case 'occupation':
        return <OccupationEmergencyStep data={data} setField={setField} />
      case 'review':
        return <ReviewStep data={data} setField={setField} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-form-bg md:flex md:h-screen md:overflow-hidden">
      <StepSidebar
        steps={sidebarSteps}
        onSelect={goToStep}
        onViewIdCard={() => navigate(isEditMode ? `/members/${id}` : '/members/new/id-card')}
      />

      <div className="mx-auto max-w-md px-4 pb-10 pt-6 md:mx-0 md:h-screen md:max-w-none md:flex-1 md:overflow-y-auto md:px-10 md:py-9 lg:px-14 xl:px-20">
        <div className="mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface shadow-card"
            >
              <Icon name="chevron" className="icon !h-[17px] !w-[17px] rotate-180 text-heading" />
            </button>
            <h1 className="font-display text-[26px] font-bold text-heading md:text-[32px]">
              {isEditMode ? 'Edit Member' : 'New Member Registration'}
            </h1>
          </div>
          <button
            onClick={() => navigate('/')}
            aria-label="Home"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface shadow-card md:hidden"
          >
            <Icon name="home" className="icon !h-[18px] !w-[18px] text-heading" />
          </button>
        </div>
        <p className="mb-6 text-[13px] text-slate">
          {isEditMode
            ? "Updating this member's registration record."
            : 'Transcribing the signed paper intake form into the system.'}
        </p>

        {/* Sticky step header — stays pinned while the step scrolls beneath it. */}
        <div className="sticky top-0 z-10 -mx-4 mb-5 flex items-center gap-3 bg-form-bg/85 px-4 py-3 backdrop-blur-md md:-mx-10 md:px-10 lg:-mx-14 lg:px-14 xl:-mx-20 xl:px-20">
          <h2 className="font-heading text-[20px] font-extrabold tracking-tight text-heading md:text-[24px]">
            {current.title}
          </h2>
        </div>

        {/* Step counter + progress bar — mobile only; desktop shows this via the step sidebar */}
        <span className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-brass-deep md:hidden">
          Step {stepIndex + 1} of {steps.length}
        </span>
        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-paper-2 md:hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brass to-brass-deep transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div
          key={current.key}
          className="motion-safe:animate-[fade-rise_0.3s_ease-out] rounded-[22px] bg-surface p-5 shadow-card md:p-8"
        >
          <div className="flex flex-col gap-4">{renderStep()}</div>
        </div>

        {saveError && (
          <p className="mt-4 rounded-xl bg-status-alert-bg px-4 py-2.5 text-[12.5px] font-semibold text-status-alert-fg">
            {saveError}
          </p>
        )}

        <div className="mt-5 flex gap-3 md:justify-between">
          <button
            onClick={goBack}
            disabled={isSaving}
            className="flex-1 rounded-xl border border-hairline bg-surface py-3.5 text-[14px] font-bold text-heading disabled:opacity-40 md:flex-none md:px-8"
          >
            {stepIndex === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={goNext}
            disabled={!canProceed || isSaving}
            className="flex-1 rounded-xl bg-ink py-3.5 text-[14px] font-bold text-white disabled:opacity-40 md:flex-none md:px-8"
          >
            {isLast ? (isSaving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Save Member') : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
