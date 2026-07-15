import { Icon } from '../../components/ui/Icon'

type StepState = 'done' | 'current' | 'upcoming' | 'skipped'

type StepSidebarProps = {
  steps: { key: string; title: string; state: StepState }[]
  onSelect: (key: string) => void
  onViewIdCard: () => void
}

// Desktop/web only — mobile keeps the top progress bar instead.
export function StepSidebar({ steps, onSelect, onViewIdCard }: StepSidebarProps) {
  const relevantCount = steps.filter((s) => s.state !== 'skipped').length

  return (
    <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:overflow-y-auto md:border-r md:border-hairline md:bg-surface md:px-5 md:py-8 lg:w-72">
      <div className="mb-8 flex items-center gap-2 px-0.5">
        <span className="h-2.5 w-2.5 rounded-full bg-brass" />
        <span className="font-display text-[16px] font-bold text-heading">SLF Members Hub</span>
      </div>

      <div className="mb-5 text-[11px] font-bold uppercase tracking-wide text-slate">
        New Member · {relevantCount} steps
      </div>

      <div className="flex flex-col gap-1">
        {steps.map((step, i) => {
          const clickable = step.state !== 'skipped'
          const Tag = clickable ? 'button' : 'div'
          return (
            <Tag
              key={step.key}
              type={clickable ? 'button' : undefined}
              onClick={clickable ? () => onSelect(step.key) : undefined}
              className={`flex items-start gap-3 rounded-xl px-1.5 py-2 text-left ${
                clickable ? 'cursor-pointer hover:bg-paper' : ''
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  step.state === 'done'
                    ? 'bg-ink text-white'
                    : step.state === 'current'
                      ? 'bg-brass text-ink-deep ring-2 ring-brass/30'
                      : step.state === 'skipped'
                        ? 'bg-paper-2 text-slate/50'
                        : 'bg-paper-2 text-slate'
                }`}
              >
                {step.state === 'done' ? <Icon name="check" className="icon !h-[12px] !w-[12px]" /> : i + 1}
              </span>
              <div>
                <span
                  className={`block text-[13px] leading-tight ${
                    step.state === 'skipped'
                      ? 'text-slate/50'
                      : step.state === 'upcoming'
                        ? 'text-slate'
                        : 'font-semibold text-heading'
                  }`}
                >
                  {step.title}
                </span>
                {step.state === 'skipped' && (
                  <span className="text-[10.5px] italic text-slate/50">Not applicable</span>
                )}
              </div>
            </Tag>
          )
        })}
      </div>

      <button
        onClick={onViewIdCard}
        className="mt-8 flex w-full items-center gap-2.5 rounded-xl border border-hairline bg-paper px-3.5 py-3 text-left hover:bg-paper-2"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface shadow-card">
          <Icon name="id" className="icon !h-[15px] !w-[15px] text-heading" />
        </span>
        <span className="text-[12.5px] font-bold text-heading">View ID Card</span>
      </button>
    </aside>
  )
}
