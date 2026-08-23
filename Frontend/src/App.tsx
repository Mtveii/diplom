import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import AuthBootstrap from '@/components/AuthBootstrap'
import CommandPalette from '@/components/CommandPalette'
import Toaster from '@/components/Toaster'
import AnalyticsPage from '@/pages/AnalyticsPage'
import UsersPage from '@/pages/UsersPage'
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
              <UsersPage />
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
              <AnalyticsPage />
            </AppLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          }
        />
        <Route
          path="/command-center"
          element={
            <AppLayout>
              <CommandCenterPage />
            </AppLayout>
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