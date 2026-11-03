import { lazy } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'

const NotFound = lazy(() => import('./NotFound.jsx'))

// Guests are sent to sign in and brought back afterwards; non-admins see a 404 so admin pages stay hidden.
function RequireAuth({ admin = false, fallback = <NotFound />, children }) {
  const location = useLocation()
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const role = useSelector((state) => state.auth.user?.role)

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  if (admin && role !== 'admin') return fallback

  return children
}

export default RequireAuth
