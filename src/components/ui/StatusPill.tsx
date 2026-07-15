export type MemberStatus = 'regular' | 'visitor' | 'leader' | 'alert' | 'inactive'

const STATUS_STYLES: Record<MemberStatus, string> = {
  regular: 'bg-status-regular-bg text-status-regular-fg',
  visitor: 'bg-status-visitor-bg text-status-visitor-fg',
  leader: 'bg-status-leader-bg text-status-leader-fg',
  alert: 'bg-status-alert-bg text-status-alert-fg',
  inactive: 'bg-status-inactive-bg text-status-inactive-fg',
}

type StatusPillProps = {
  status: MemberStatus
  label: string
  size?: 'sm' | 'md'
}

export function StatusPill({ status, label, size = 'md' }: StatusPillProps) {
  const sizing = size === 'sm' ? 'text-[10px] px-2 py-1' : 'text-[11.5px] px-3 py-1.5'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide font-body ${sizing} ${STATUS_STYLES[status]}`}
    >
      {label}
    </span>
  )
}
