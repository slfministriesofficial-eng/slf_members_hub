import type { ReactNode } from 'react'

type ScreenHeaderProps = {
  title: string
  eyebrow?: string
  actions?: ReactNode
}

export function ScreenHeader({ title, eyebrow, actions }: ScreenHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between">
      <div>
        {eyebrow && (
          <div className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-slate font-body">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[20px] font-bold text-heading">{title}</h1>
      </div>
      {actions && <div className="flex gap-2.5">{actions}</div>}
    </div>
  )
}
