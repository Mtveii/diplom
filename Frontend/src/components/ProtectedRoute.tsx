import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: string[]
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const token = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)

  if (!token || useAuthStore.getState().isTokenExpired(token)) {
    return <Navigate to="/login" replace />
  }

  if (roles && roles.length > 0 && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
