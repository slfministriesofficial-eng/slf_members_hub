import type { PropsWithChildren } from 'react'
import { Icon } from './Icon'

type IconButtonProps = PropsWithChildren<{
  icon: string
  onClick?: () => void
  dot?: boolean
  className?: string
}>

export function IconButton({ icon, onClick, dot = false, className = '' }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex h-9 w-9 items-center justify-center rounded-full bg-surface text-heading shadow-card ${className}`}
    >
      <Icon name={icon} className="icon !h-[17px] !w-[17px]" />
      {dot && (
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full border-[1.5px] border-white bg-status-alert-fg" />
      )}
    </button>
  )
}
