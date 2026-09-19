import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Avatar } from '../components/ui/Avatar'
import { Card } from '../components/ui/Card'
import { ConfirmRemoveModal } from '../components/ui/ConfirmRemoveModal'
import { StatusPill } from '../components/ui/StatusPill'
import { useAuth } from '../auth/AuthContext'
import { usePastors } from '../features/pastors/PastorsContext'
import { PASTOR_STATUS_TONE, type Pastor, type PastorStatus } from '../features/pastors/types'

function statusOf(pastor: Pastor): PastorStatus {
  return pastor.status === 'Verified' || pastor.status === 'Approved' ? pastor.status : 'Pending'
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-4 border-b border-hairline py-2.5 last:border-0">
      <span className="shrink-0 text-[12px] text-slate">{label}</span>
      <span className="text-right text-[12.5px] font-semibold text-heading">{value}</span>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <Card className="mb-4 p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <Icon name={icon} className="icon !h-[14px] !w-[14px] text-brass-deep" />
        <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-heading">{title}</h2>
      </div>
      <div>{children}</div>
    </Card>
  )
}

/**
 * One pastor's full fellowship record, plus the office sign-off (section 9 of
 * the paper form) — verification and approval happen here rather than in the
 * registration wizard, because they happen later and often by someone else.
 */
export function PastorProfileScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { adminName } = useAuth()
  const { getPastor, setApproval, isApproving, deletePastor, isDeleting, isLoading } = usePastors()
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const pastor = id ? getPastor(id) : undefined

  if (isLoading) {
    return <p className="py-16 text-center text-[13px] text-slate">Loading…</p>
  }

  if (!pastor) {
    return (
      <div className="py-16 text-center">
        <p className="text-[13.5px] font-bold text-heading">Pastor not found</p>
        <button
          onClick={() => navigate('/pastors')}
          className="mx-auto mt-3 rounded-full bg-ink px-5 py-2.5 text-[12.5px] font-bold text-white"
        >
          Back to Pastors
        </button>
      </div>
    )
  }

  const status = statusOf(pastor)
  const fullAddress = [
    pastor.address,
    pastor.villageTownCity,
    pastor.district,
    pastor.state,
    pastor.pinCode,
  ]
    .filter(Boolean)
    .join(', ')

  async function changeStatus(next: PastorStatus) {
    if (!pastor) return
    setActionError(null)
    try {
      await setApproval(pastor.memberId, next, adminName || 'Admin')
    } catch {
      setActionError('Could not update the approval — check your connection and try again.')
    }
  }

  async function handleRemove(reason: string) {
    if (!pastor) return
    try {
      await deletePastor(pastor.memberId, reason)
      navigate('/pastors')
    } catch {
      setConfirmRemove(false)
      setActionError('Could not remove this pastor — check your connection and try again.')
    }
  }

  return (
    <div className="motion-safe:animate-[fade-rise_0.4s_ease-out_both] pb-10">
      <div className="mb-4 flex items-center gap-1">
        <button
          onClick={() => navigate('/pastors')}
          aria-label="Back"
          className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:text-heading"
        >
          <Icon name="arrow-left" className="icon !h-[19px] !w-[19px]" />
        </button>
        <h1 className="font-display text-[20px] font-bold text-heading md:text-[24px]">Pastor Profile</h1>
      </div>

      {/* Identity header */}
      <Card className="mb-4 p-5">
        <div className="flex items-start gap-3.5">
          <Avatar initials={pastor.initials} color={pastor.color} size={56} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[18px] font-bold text-heading">{pastor.fullName}</div>
            <div className="font-mono text-[11.5px] text-slate">{pastor.memberId}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill status={PASTOR_STATUS_TONE[status]} label={status} size="sm" />
              {pastor.currentPosition && (
                <span className="text-[11.5px] text-slate">{pastor.currentPosition}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {pastor.whatsapp && (
            <a
              href={`https://wa.me/${pastor.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-paper py-2.5 text-[12.5px] font-bold text-heading"
            >
              <Icon name="whatsapp" className="icon !h-[14px] !w-[14px]" />
              WhatsApp
            </a>
          )}
          {pastor.mobile && (
            <a
              href={`tel:${pastor.mobile.replace(/\s/g, '')}`}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline bg-paper py-2.5 text-[12.5px] font-bold text-heading"
            >
              <Icon name="phone" className="icon !h-[14px] !w-[14px]" />
              Call
            </a>
          )}
          <button
            onClick={() => navigate(`/pastors/${pastor.memberId}/edit`)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink py-2.5 text-[12.5px] font-bold text-white"
          >
            <Icon name="pencil" className="icon !h-[14px] !w-[14px]" />
            Edit
          </button>
        </div>
      </Card>

      {actionError && (
        <p className="mb-4 rounded-xl bg-status-alert-bg px-4 py-2.5 text-[12.5px] font-semibold text-status-alert-fg">
          {actionError}
        </p>
      )}

      {/* Section 9 — office verification & approval */}
      <Card className="mb-4 p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Icon name="shield" className="icon !h-[14px] !w-[14px] text-brass-deep" />
          <h2 className="text-[12.5px] font-bold uppercase tracking-wide text-heading">
            Office Verification &amp; Approval
          </h2>
        </div>
        <Row label="Verified By" value={pastor.verifiedBy} />
        <Row label="Verification Date" value={pastor.verificationDate} />
        <Row label="Approved By" value={pastor.approvedBy} />
        <Row label="Approval Date" value={pastor.approvalDate} />

        <div className="mt-3 flex flex-wrap gap-2">
          {status === 'Pending' && (
            <button
              onClick={() => changeStatus('Verified')}
              disabled={isApproving}
              className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50"
            >
              <Icon name="check" className="icon !h-[14px] !w-[14px]" />
              Mark Verified
            </button>
          )}
          {status !== 'Approved' && (
            <button
              onClick={() => changeStatus('Approved')}
              disabled={isApproving}
              className="flex items-center gap-1.5 rounded-full bg-status-regular-fg px-4 py-2.5 text-[12.5px] font-bold text-white disabled:opacity-50"
            >
              <Icon name="shield" className="icon !h-[14px] !w-[14px]" />
              Approve
            </button>
          )}
          {status !== 'Pending' && (
            <button
              onClick={() => changeStatus('Pending')}
              disabled={isApproving}
              className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-4 py-2.5 text-[12.5px] font-bold text-slate disabled:opacity-50"
            >
              <Icon name="refresh" className="icon !h-[14px] !w-[14px]" />
              Reset to Pending
            </button>
          )}
        </div>
        {status !== 'Pending' && (
          <p className="mt-2 text-[11px] text-slate">
            Resetting clears both the verification and approval stamps.
          </p>
        )}
      </Card>

      <Section title="Personal" icon="user">
        <Row label="Preferred Name" value={pastor.preferredName} />
        <Row label="Date of Birth" value={pastor.dob} />
        <Row label="Gender" value={pastor.gender} />
        <Row label="Marital Status" value={pastor.maritalStatus} />
        <Row label="Spouse Name" value={pastor.spouseName} />
        <Row label="Blood Group" value={pastor.bloodGroup} />
        <Row label="Registered" value={pastor.registrationDate} />
      </Section>

      <Section title="Contact & Address" icon="phone">
        <Row label="Mobile" value={pastor.mobile} />
        <Row label="WhatsApp" value={pastor.whatsapp} />
        <Row label="Email" value={pastor.email} />
        <Row label="Address" value={fullAddress} />
      </Section>

      <Section title="Church & Ministry" icon="building">
        <Row label="Church Name" value={pastor.churchName} />
        <Row label="Denomination" value={pastor.denomination} />
        <Row label="Church Address" value={pastor.churchAddress} />
        <Row label="Position" value={pastor.currentPosition} />
        <Row label="Experience (years)" value={pastor.yearsOfExperience} />
        <Row label="Ministry Location" value={pastor.ministryLocation} />
      </Section>

      {(pastor.theologicalTraining ||
        pastor.institutionName ||
        pastor.degreeEarned ||
        pastor.graduationYear ||
        pastor.otherTraining) && (
        <Section title="Theological Education" icon="note">
          <Row label="Training" value={pastor.theologicalTraining} />
          <Row label="Institution" value={pastor.institutionName} />
          <Row label="Degree / Diploma" value={pastor.degreeEarned} />
          <Row label="Year of Graduation" value={pastor.graduationYear} />
          <Row label="Other Training" value={pastor.otherTraining} />
        </Section>
      )}

      {(pastor.reasonToJoin || pastor.howHeard) && (
        <Section title="Fellowship" icon="heart">
          {pastor.reasonToJoin && (
            <div className="border-b border-hairline py-2.5 last:border-0">
              <div className="mb-1 text-[12px] text-slate">Why they want to join</div>
              <p className="text-[12.5px] leading-relaxed text-heading">{pastor.reasonToJoin}</p>
            </div>
          )}
          {pastor.howHeard && (
            <div className="py-2.5">
              <div className="mb-1 text-[12px] text-slate">How they heard about the fellowship</div>
              <p className="text-[12.5px] leading-relaxed text-heading">{pastor.howHeard}</p>
            </div>
          )}
        </Section>
      )}

      {(pastor.ref1Name || pastor.ref2Name) && (
        <Section title="References — Office Only" icon="lock-small">
          <Row label="Reference 1" value={pastor.ref1Name} />
          <Row label="Contact" value={pastor.ref1Phone} />
          <Row label="Reference 2" value={pastor.ref2Name} />
          <Row label="Contact" value={pastor.ref2Phone} />
        </Section>
      )}

      <Card className="mb-4">
        <button
          onClick={() => setConfirmRemove(true)}
          disabled={isDeleting}
          className="flex w-full items-center gap-3 px-3.5 py-3 text-left disabled:opacity-50"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-status-alert-bg">
            <Icon name="trash" className="icon !h-[15px] !w-[15px] text-status-alert-fg" />
          </span>
          <span className="flex-1 text-[12.5px] font-semibold text-status-alert-fg">
            {isDeleting ? 'Removing…' : 'Remove from fellowship'}
          </span>
        </button>
      </Card>

      {confirmRemove && (
        <ConfirmRemoveModal
          title="Remove Pastor?"
          subtitle="The record is archived, not erased."
          body={
            <>
              <strong>{pastor.fullName}</strong> will be removed from the fellowship register. The full
              record is kept on the Deleted Pastors sheet.
            </>
          }
          reasonPlaceholder="Reason (optional) — saved with the archived record"
          confirmLabel="Remove Pastor"
          onCancel={() => setConfirmRemove(false)}
          onConfirm={handleRemove}
        />
      )}
    </div>
  )
}
