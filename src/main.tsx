import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthContext'
import { ThemeProvider } from './theme/ThemeContext'
import { MembersProvider } from './features/members/MembersContext'
import { DraftMemberProvider } from './features/members/DraftMemberContext'
import { NotificationProvider } from './notifications/NotificationContext'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <MembersProvider>
              <DraftMemberProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </DraftMemberProvider>
            </MembersProvider>
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
