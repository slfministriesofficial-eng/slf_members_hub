import { ConfirmRemoveModal } from '../../components/ui/ConfirmRemoveModal'
import type { Member } from '../../mock/types'

type DeleteMemberModalProps = {
  member: Member
  onCancel: () => void
  onConfirm: (reason: string) => void
}

// Shared by the Members directory and the Member Profile page so "remove a
// member" behaves identically everywhere — confirm, optional reason, and (if
// a reason is given) an automatic WhatsApp notice to that member. Thin wrapper
// over the generic ConfirmRemoveModal (also used to revoke attendance takers).
export function DeleteMemberModal({ member, onCancel, onConfirm }: DeleteMemberModalProps) {
  return (
    <ConfirmRemoveModal
      title="Remove Member?"
      subtitle="This can't be undone."
      body={
        <>
          Remove <b className="font-semibold text-heading">{member.name}</b> from the member list?
        </>
      }
      firstName={member.name.split(' ')[0]}
      reasonPlaceholder="e.g. Moved to another church"
      confirmLabel="Remove Member"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}
