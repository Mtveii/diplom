import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import AuthBootstrap from '@/components/AuthBootstrap'
import CommandPalette from '@/components/CommandPalette'
import ProtectedRoute from '@/components/ProtectedRoute'
import Toaster from '@/components/Toaster'
import AnalyticsPage from '@/pages/AnalyticsPage'
import UsersPage from '@/pages/UsersPage'
import CommandCenterPage from '@/pages/CommandCenterPage'
import DashboardPage from '@/pages/DashboardPage'
import GameMonitorPage from '@/pages/GameMonitorPage'
import GameDetailPage from '@/pages/GameDetailPage'
import LoginPage from '@/pages/LoginPage'
import ProfilePage from '@/pages/ProfilePage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <AuthBootstrap>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/members"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <UsersPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/games"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <GameMonitorPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <GameDetailPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <AnalyticsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ProfilePage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <SettingsPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/command-center"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <CommandCenterPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
        <CommandPalette />
      </BrowserRouter>
    </AuthBootstrap>
  )
}