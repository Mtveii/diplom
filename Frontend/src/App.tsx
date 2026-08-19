import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import CommandPalette from '@/components/CommandPalette'
import ProtectedRoute from '@/components/ProtectedRoute'
import Toaster from '@/components/Toaster'
import AnalyticsPage from '@/pages/AnalyticsPage'
import ApplicationsPage from '@/pages/ApplicationsPage'
import AuthPage from '@/pages/AuthPage'
import ClanMembersPage from '@/pages/ClanMembersPage'
import CommandCenterPage from '@/pages/CommandCenterPage'
import DashboardPage from '@/pages/DashboardPage'
import GameMonitorPage from '@/pages/GameMonitorPage'
import GameDetailPage from '@/pages/GameDetailPage'
import SettingsPage from '@/pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/login/callback" element={<AuthPage />} />

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
            <ProtectedRoute requiredRole={['Moderator', 'SuperAdmin']}>
              <AppLayout>
                <ClanMembersPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/applications"
          element={
            <ProtectedRoute requiredRole={['Moderator', 'SuperAdmin']}>
              <AppLayout>
                <ApplicationsPage />
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
            <ProtectedRoute requiredRole={['Analyst', 'Moderator', 'SuperAdmin']}>
              <AppLayout>
                <AnalyticsPage />
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
  )
}