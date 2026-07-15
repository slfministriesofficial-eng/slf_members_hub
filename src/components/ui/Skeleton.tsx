type SkeletonProps = {
  className?: string
}

// Base primitive — a shimmering block. Compose with width/height utility
// classes at the call site so each skeleton matches its real counterpart's size.
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />
}

// Matches Avatar + two text lines + StatusPill + chevron — MembersScreen/AttendanceScreen rows.
export function SkeletonListRow({ trailing = 'pill' }: { trailing?: 'pill' | 'toggle' | 'chevron' }) {
  return (
    <div className="flex w-full items-center gap-2.5 border-b border-hairline py-2.5 last:border-0">
      <Skeleton className="h-[38px] w-[38px] shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-[13px] w-[60%] rounded" />
        <Skeleton className="mt-1.5 h-[11px] w-[40%] rounded" />
      </div>
      {trailing === 'pill' && <Skeleton className="h-[22px] w-16 shrink-0 rounded-full" />}
      {trailing === 'toggle' && <Skeleton className="h-[30px] w-20 shrink-0 rounded-xl" />}
      {trailing === 'chevron' && <Skeleton className="h-4 w-4 shrink-0 rounded" />}
    </div>
  )
}

// Matches HomeScreen's stat Cards (number + label).
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl bg-surface p-3.5 shadow-card">
      <Skeleton className="h-[24px] w-10 rounded" />
      <Skeleton className="mt-2 h-[11px] w-20 rounded" />
    </div>
  )
}

// Matches HomeScreen's "This week" upcoming-date card.
export function SkeletonUpcomingCard() {
  return (
    <div className="w-[118px] shrink-0 rounded-2xl bg-surface p-3 shadow-card md:flex md:w-full md:items-center md:gap-3">
      <Skeleton className="mx-auto h-[19px] w-8 rounded md:mx-0" />
      <div className="mt-2 md:mt-0 md:flex-1">
        <Skeleton className="mx-auto h-[11px] w-16 rounded md:mx-0" />
        <Skeleton className="mx-auto mt-1.5 h-[10px] w-12 rounded md:mx-0" />
      </div>
    </div>
  )
}

// Matches HomeScreen's Recent activity row (bullet dot + text + timestamp).
export function SkeletonActivityRow({ last = false }: { last?: boolean }) {
  return (
    <div className={`flex gap-2.5 px-3 py-2.5 ${last ? '' : 'border-b border-hairline'}`}>
      <Skeleton className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-[12px] w-[70%] rounded" />
        <Skeleton className="mt-1.5 h-[10px] w-20 rounded" />
      </div>
    </div>
  )
}

// Matches the aspect-[8/5] IdCard footprint on MemberProfileScreen/MembershipCardsScreen.
export function SkeletonIdCard() {
  return <Skeleton className="aspect-[8/5] w-full rounded-2xl" />
}
