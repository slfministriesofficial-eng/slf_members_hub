import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav } from '../nav/BottomNav'
import { NavDrawer } from '../nav/NavDrawer'
import { Sidebar } from '../nav/Sidebar'
import { TopBar } from './TopBar'
import { Icon } from '../ui/Icon'

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-paper md:flex md:h-screen md:overflow-hidden">
      {/* Desktop/web only — mobile layout below is untouched */}
      <Sidebar />
      <div className="mx-auto max-w-md px-4 pb-28 pt-6 md:mx-0 md:h-screen md:max-w-none md:flex-1 md:overflow-y-auto md:px-10 md:py-8">
        {/* Mobile-only app bar — hamburger opens the NavDrawer; each screen's own header stays untouched below it */}
        <div className="mb-4 flex items-center gap-3 md:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-heading shadow-card"
          >
            <Icon name="menu" className="icon !h-[18px] !w-[18px]" />
          </button>
          <span className="font-display text-[14px] font-bold text-heading">SLF Members Hub</span>
        </div>

        <TopBar />
        <Outlet />
      </div>
      <BottomNav onMoreClick={() => setDrawerOpen(true)} isMoreActive={drawerOpen} />
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
