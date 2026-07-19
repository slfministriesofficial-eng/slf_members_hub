import { Icon } from './Icon'

// Shared by any drill-in page that needs a plain "back arrow + big bold
// title" header (AttendanceMarkAllScreen's "All Members", MemberProfileScreen's
// "Member Profile", …) so the treatment stays identical everywhere it's used.
export function PageBackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <button
        onClick={onBack}
        aria-label="Back"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:text-heading"
      >
        <Icon name="arrow-left" className="icon !h-[19px] !w-[19px]" />
      </button>
      <h1 className="truncate font-display text-[26px] font-bold text-heading md:text-[28px]">{title}</h1>
    </div>
  )
}
