import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from '../nav/BottomNav'
import { NavDrawer } from '../nav/NavDrawer'
import { Sidebar } from '../nav/Sidebar'
import { TopBar } from './TopBar'
import { Icon } from '../ui/Icon'

// Exactly the destinations reachable directly from the drawer/bottom nav —
// arriving at one of these is always a fresh jump, not a drill-down, so the
// back X here goes straight to the dashboard rather than one history step
// (which could land somewhere unrelated depending on where the drawer was
// opened from). Anything NOT in this list is a drill-in page (a page's own
// "View Profile", "Send Wish", edit form, etc.) where one step back is correct.
const PRIMARY_PATHS = new Set([
  '/members',
  '/attendance',
  '/follow-ups',
  '/announcements',
  '/birthdays',
  '/membership-cards',
  '/reports',
  '/more',
  '/access',
])

// Drill-in pages that already render their own dedicated close/back button in
// their own header (SendWishScreen, MemberQuickProfileScreen, CelebrationListScreen,
// AttendanceMarkAllScreen) — showing this global X on top of that produced two
// X icons on the same screen.
const OWN_CLOSE_BUTTON_PREFIXES = ['/send-wish/', '/celebration-profile/', '/birthdays/', '/attendance/']

// Focused full-screen tools (their own header already fills that role) — the
// global hamburger/title row is redundant chrome stacked above their own on
// these, not just the X button, so it's skipped entirely rather than shown.
// "/members/" here matches only /members/:id (the profile page, which has its
// own "Back to Members" button) — the bare /members list page is unaffected.
const HIDE_TOP_BAR_PREFIXES = [
  '/attendance/all',
  '/members/',
  '/celebration-profile/',
  '/send-wish/',
  '/birthdays/',
]

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isDashboard = pathname === '/'
  const isPrimaryPage = PRIMARY_PATHS.has(pathname)
  const hasOwnCloseButton = OWN_CLOSE_BUTTON_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const hideTopBar = HIDE_TOP_BAR_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  return (
    <div className="min-h-screen bg-paper md:flex md:h-screen md:overflow-hidden">
      {/* Desktop/web only — mobile layout below is untouched */}
      <Sidebar />
      <div className="mx-auto max-w-md px-4 pb-28 pt-6 md:mx-0 md:h-screen md:max-w-none md:flex-1 md:overflow-y-auto md:px-10 md:py-8">
        {/* Mobile-only app bar — hamburger opens the NavDrawer; each screen's own header stays untouched below it.
            X is hidden on the dashboard itself (nothing to go back to); on a primary drawer/bottom-nav
            destination it jumps to the dashboard; on a drill-in page it's a plain one-step history back. */}
        {!hideTopBar && (
          <div className="mb-4 flex items-center gap-3 md:hidden">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-heading shadow-card"
            >
              <Icon name="menu" className="icon !h-[18px] !w-[18px]" />
            </button>
            <span className="flex-1 font-display text-[14px] font-bold text-heading">SLF Members Hub</span>
            {!isDashboard && !hasOwnCloseButton && (
              <button
                onClick={() => (isPrimaryPage ? navigate('/') : navigate(-1))}
                aria-label={isPrimaryPage ? 'Back to Dashboard' : 'Back'}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate transition-colors hover:text-heading"
              >
                <Icon name="x" className="icon !h-[18px] !w-[18px]" />
              </button>
            )}
          </div>
        )}

        <TopBar />
        <Outlet />
      </div>
      <BottomNav onMoreClick={() => setDrawerOpen(true)} isMoreActive={drawerOpen} />
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
