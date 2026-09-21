import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import AuthBootstrap from '@/components/AuthBootstrap'
import CommandPalette from '@/components/CommandPalette'
import RequireRole from '@/components/RequireRole'
import Toaster from '@/components/Toaster'
import AnalyticsPage from '@/pages/AnalyticsPage'
import UsersPage from '@/pages/UsersPage'
import UserDetailPage from '@/pages/UserDetailPage'
import NotFoundPage from '@/pages/NotFoundPage'
import CommandCenterPage from '@/pages/CommandCenterPage'
import DashboardPage from '@/pages/DashboardPage'
import GameMonitorPage from '@/pages/GameMonitorPage'
import GameDetailPage from '@/pages/GameDetailPage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <AuthBootstrap>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            }
          />
          <Route
            path="/members"
            element={
              <AppLayout>
                <RequireRole path="/members">
                  <UsersPage />
                </RequireRole>
              </AppLayout>
            }
          />
          <Route
            path="/members/:id"
            element={
              <AppLayout>
                <RequireRole path="/members">
                  <UserDetailPage />
                </RequireRole>
              </AppLayout>
            }
          />
          <Route
            path="/games"
            element={
              <AppLayout>
                <GameMonitorPage />
              </AppLayout>
            }
          />
          <Route
            path="/games/:id"
            element={
              <AppLayout>
                <GameDetailPage />
              </AppLayout>
            }
          />
          <Route
            path="/analytics"
            element={
              <AppLayout>
                <RequireRole path="/analytics">
                  <AnalyticsPage />
                </RequireRole>
              </AppLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <AppLayout>
                <RequireRole path="/settings">
                  <SettingsPage />
                </RequireRole>
              </AppLayout>
            }
          />
          <Route
            path="/command-center"
            element={
              <AppLayout>
                <RequireRole path="/command-center">
                  <CommandCenterPage />
                </RequireRole>
              </AppLayout>
            }
          />

          <Route
            path="*"
            element={
              <AppLayout>
                <NotFoundPage />
              </AppLayout>
            }
          />
        </Routes>
        <Toaster />
        <CommandPalette />
      </BrowserRouter>
    </AuthBootstrap>
  )
}