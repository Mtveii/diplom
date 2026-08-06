import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  children: ReactNode
  requiredRole?: Array<'Viewer' | 'Analyst' | 'Moderator' | 'SuperAdmin'>
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const hasRole = useAuthStore((state) => state.hasRole)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}