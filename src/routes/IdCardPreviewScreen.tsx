import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import type { MemberStatus } from '../components/ui/StatusPill'
import { IdCardFlipper } from '../features/members/IdCardFlipper'
import { useDraftMember } from '../features/members/DraftMemberContext'

export function IdCardPreviewScreen() {
  const navigate = useNavigate()
  const { data, previewMemberId } = useDraftMember()
  const isVisitor = data.firstTimeVisiting === 'Yes'
  const status: MemberStatus = isVisitor ? 'visitor' : 'regular'

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-6 py-8 md:px-12 md:py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'linear-gradient(120deg, #F5F7FA, #EAF2FB, #FDF3E3, #F1EAFB, #EAF6EE, #F5F7FA)',
          backgroundSize: '400% 400%',
          animation: 'gradient-drift 20s ease infinite',
        }}
      />

      <button
        onClick={() => navigate(-1)}
        className="relative mb-10 flex w-fit items-center gap-1.5 rounded-full bg-surface px-5 py-2.5 font-heading text-[14px] font-extrabold text-brass-deep shadow-card"
      >
        <Icon name="chevron" className="icon !h-[15px] !w-[15px] rotate-180 text-brass-deep" />
        Back to form
      </button>

      <div className="relative flex flex-1 items-center justify-center">
        <div className="w-full max-w-[560px]">
          <IdCardFlipper
            name={data.fullName}
            memberId={previewMemberId}
            mobile={data.mobile}
            bloodGroup={data.bloodGroup}
            status={status}
            statusLabel={isVisitor ? 'Visitor' : 'Member'}
            sinceYear={data.joiningDate ? data.joiningDate.slice(0, 4) : undefined}
          />
        </div>
      </div>
    </div>
  )
}
