import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { SplashScreen } from './components/layout/SplashScreen'
import { useAuth } from './auth/AuthContext'
import { LoginScreen } from './routes/LoginScreen'
import { WelcomeTransition } from './routes/WelcomeTransition'
import { PublicMemberProfileScreen } from './routes/PublicMemberProfileScreen'
import { HomeScreen } from './routes/HomeScreen'
import { MembersScreen } from './routes/MembersScreen'
import { MemberProfileScreen } from './routes/MemberProfileScreen'
import { AddMemberScreen } from './routes/AddMemberScreen'
import { IdCardPreviewScreen } from './routes/IdCardPreviewScreen'
import { AttendanceScreen } from './routes/AttendanceScreen'
import { FollowUpsScreen } from './routes/FollowUpsScreen'
import { BirthdaysScreen } from './routes/BirthdaysScreen'
import { CelebrationListScreen } from './routes/CelebrationListScreen'
import { SendWishScreen } from './routes/SendWishScreen'
import { MemberQuickProfileScreen } from './routes/MemberQuickProfileScreen'
import { AnnouncementsScreen } from './routes/AnnouncementsScreen'
import { MembershipCardsScreen } from './routes/MembershipCardsScreen'
import { MoreScreen } from './routes/MoreScreen'
import { ReportsScreen } from './routes/ReportsScreen'
import { AccessSettingsScreen } from './routes/AccessSettingsScreen'

function App() {
  const { isAuthenticated, showWelcome } = useAuth()

  return (
    <>
      {/* Dashboard mounts immediately — the welcome overlay below sits on top of it
          and reveals it when it finishes, rather than the dashboard appearing after. */}
      <Routes>
        {/* Public — this is where every membership card's QR code points, so it
            has to be reachable without logging in, before the auth gate below. */}
        <Route path="/member" element={<PublicMemberProfileScreen />} />

        {!isAuthenticated ? (
          <Route path="*" element={<LoginScreen />} />
        ) : (
          <>
            {/* Standalone, no sidebar/bottom-nav — a focused task shouldn't tempt a distracted exit mid-form */}
            <Route path="/members/new" element={<AddMemberScreen />} />
            <Route path="/members/new/id-card" element={<IdCardPreviewScreen />} />
            <Route path="/members/:id/edit" element={<AddMemberScreen />} />

            <Route element={<AppShell />}>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/members" element={<MembersScreen />} />
              <Route path="/members/:id" element={<MemberProfileScreen />} />
              <Route path="/attendance" element={<AttendanceScreen />} />
              <Route path="/follow-ups" element={<FollowUpsScreen />} />
              <Route path="/birthdays" element={<BirthdaysScreen />} />
              <Route path="/birthdays/:type" element={<CelebrationListScreen />} />
              <Route path="/send-wish/:kind/:memberId" element={<SendWishScreen />} />
              <Route path="/celebration-profile/:type/:memberId" element={<MemberQuickProfileScreen />} />
              <Route path="/announcements" element={<AnnouncementsScreen />} />
              <Route path="/membership-cards" element={<MembershipCardsScreen />} />
              <Route path="/more" element={<MoreScreen />} />
              <Route path="/reports" element={<ReportsScreen />} />
              <Route path="/access" element={<AccessSettingsScreen />} />
            </Route>
          </>
        )}
      </Routes>
      {isAuthenticated && showWelcome && <WelcomeTransition />}
      <SplashScreen />
    </>
  )
}

export default App
