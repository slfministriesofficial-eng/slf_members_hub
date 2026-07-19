import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { TakerShell } from './components/layout/TakerShell'
import { SplashScreen } from './components/layout/SplashScreen'
import { useAuth } from './auth/AuthContext'
import { LoginScreen } from './routes/LoginScreen'
import { AttendanceLoginScreen } from './routes/AttendanceLoginScreen'
import { TakerLoginScreen } from './routes/TakerLoginScreen'
import { SignedOutScreen } from './routes/SignedOutScreen'
import { AttendanceHistoryScreen } from './routes/AttendanceHistoryScreen'
import { WelcomeTransition } from './routes/WelcomeTransition'
import { PublicMemberProfileScreen } from './routes/PublicMemberProfileScreen'
import { HomeScreen } from './routes/HomeScreen'
import { MembersScreen } from './routes/MembersScreen'
import { MembersAllScreen } from './routes/MembersAllScreen'
import { MemberProfileScreen } from './routes/MemberProfileScreen'
import { AddMemberScreen } from './routes/AddMemberScreen'
import { IdCardPreviewScreen } from './routes/IdCardPreviewScreen'
import { AttendanceHubScreen } from './routes/AttendanceHubScreen'
import { TakerHubScreen } from './routes/TakerHubScreen'
import { TakerProfileScreen } from './routes/TakerProfileScreen'
import { AttendanceMarkAllScreen } from './routes/AttendanceMarkAllScreen'
import { AttendanceAccessScreen } from './routes/AttendanceAccessScreen'
import { FollowUpsScreen } from './routes/FollowUpsScreen'
import { BirthdaysScreen } from './routes/BirthdaysScreen'
import { CelebrationListScreen } from './routes/CelebrationListScreen'
import { SendWishScreen } from './routes/SendWishScreen'
import { MemberQuickProfileScreen } from './routes/MemberQuickProfileScreen'
import { AnnouncementsScreen } from './routes/AnnouncementsScreen'
import { SendNotificationScreen } from './routes/SendNotificationScreen'
import { WhatsappAnnouncementScreen } from './routes/WhatsappAnnouncementScreen'
import { ScheduleAnnouncementScreen } from './routes/ScheduleAnnouncementScreen'
import { NotificationScheduleScreen } from './routes/NotificationScheduleScreen'
import { MembershipCardsScreen } from './routes/MembershipCardsScreen'
import { MoreScreen } from './routes/MoreScreen'
import { AdminProfileScreen } from './routes/AdminProfileScreen'
import { ReportsScreen } from './routes/ReportsScreen'
import { AccessSettingsScreen } from './routes/AccessSettingsScreen'
import { ActivityScreen } from './routes/ActivityScreen'
import { NotificationsSentScreen } from './routes/NotificationsSentScreen'

function App() {
  const { isAuthenticated, role, showWelcome, authChecking } = useAuth()

  // Hold everything until a stored attendance-taker token finishes verifying,
  // so a signed-in taker never flashes the admin login screen on launch.
  if (authChecking) return <SplashScreen />

  return (
    <>
      {/* Dashboard mounts immediately — the welcome overlay below sits on top of it
          and reveals it when it finishes, rather than the dashboard appearing after. */}
      <Routes>
        {/* Public — this is where every membership card's QR code points, so it
            has to be reachable without logging in, before the auth gate below. */}
        <Route path="/member" element={<PublicMemberProfileScreen />} />
        {/* Public magic-link — the attendance taker's WhatsApp invite lands here
            and signs them in, so it must be reachable before the auth gate. */}
        <Route path="/attend/:token" element={<AttendanceLoginScreen />} />
        {/* Branded goodbye for a signed-out attendance taker (they re-enter via
            their link, not a password), so it must be reachable while logged out. */}
        <Route path="/signed-out" element={<SignedOutScreen />} />
        {/* Attendance-taker email sign-in (no password) — public. */}
        <Route path="/taker-login" element={<TakerLoginScreen />} />

        {!isAuthenticated ? (
          <Route path="*" element={<LoginScreen />} />
        ) : role === 'attendance-taker' ? (
          // Locked-down role: attendance + add-member only; everything else
          // redirects to /attendance so there's no way to reach admin surfaces.
          <>
            <Route path="/members/new" element={<AddMemberScreen />} />
            <Route path="/members/new/id-card" element={<IdCardPreviewScreen />} />
            <Route element={<TakerShell />}>
              <Route path="/attendance" element={<TakerHubScreen />} />
              <Route path="/attendance/profile" element={<TakerProfileScreen />} />
              <Route path="/attendance/all" element={<AttendanceMarkAllScreen />} />
              <Route path="/attendance/history" element={<AttendanceHistoryScreen />} />
              {/* Read-only mini profile the taker opens by tapping a member. */}
              <Route path="/celebration-profile/:type/:memberId" element={<MemberQuickProfileScreen />} />
            </Route>
            <Route path="*" element={<Navigate to="/attendance" replace />} />
          </>
        ) : (
          <>
            {/* Standalone, no sidebar/bottom-nav — a focused task shouldn't tempt a distracted exit mid-form */}
            <Route path="/members/new" element={<AddMemberScreen />} />
            <Route path="/members/new/id-card" element={<IdCardPreviewScreen />} />
            <Route path="/members/:id/edit" element={<AddMemberScreen />} />

            <Route element={<AppShell />}>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/members" element={<MembersScreen />} />
              <Route path="/members/all" element={<MembersAllScreen />} />
              <Route path="/members/:id" element={<MemberProfileScreen />} />
              <Route path="/attendance" element={<AttendanceHubScreen />} />
              <Route path="/attendance/all" element={<AttendanceMarkAllScreen />} />
              <Route path="/attendance/access" element={<AttendanceAccessScreen />} />
              <Route path="/attendance/history" element={<AttendanceHistoryScreen />} />
              <Route path="/follow-ups" element={<FollowUpsScreen />} />
              <Route path="/birthdays" element={<BirthdaysScreen />} />
              <Route path="/birthdays/:type" element={<CelebrationListScreen />} />
              <Route path="/send-wish/:kind/:memberId" element={<SendWishScreen />} />
              <Route path="/celebration-profile/:type/:memberId" element={<MemberQuickProfileScreen />} />
              <Route path="/announcements" element={<AnnouncementsScreen />} />
              <Route path="/announcements/send" element={<SendNotificationScreen />} />
              <Route path="/announcements/whatsapp" element={<WhatsappAnnouncementScreen />} />
              <Route path="/announcements/schedule" element={<ScheduleAnnouncementScreen />} />
              <Route path="/follow-ups/schedule" element={<NotificationScheduleScreen />} />
              <Route path="/membership-cards" element={<MembershipCardsScreen />} />
              <Route path="/more" element={<MoreScreen />} />
              <Route path="/profile" element={<AdminProfileScreen />} />
              <Route path="/reports" element={<ReportsScreen />} />
              <Route path="/access" element={<AccessSettingsScreen />} />
              <Route path="/activity" element={<ActivityScreen />} />
              <Route path="/notifications-sent" element={<NotificationsSentScreen />} />
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
