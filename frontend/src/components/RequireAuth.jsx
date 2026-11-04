import { lazy } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PageLoader from './PageLoader.jsx'

const NotFound = lazy(() => import('./NotFound.jsx'))

// Guests are sent to sign in and brought back afterwards; users without one of `roles` see a 404 so those pages stay hidden.
// Role-gated pages wait for the server to confirm the session, so a stale or edited profile in localStorage
// never decides access. The API checks the role from the database on every request regardless.
function RequireAuth({ roles, fallback = <NotFound />, children }) {
  const location = useLocation()
  const { isAuthenticated, sessionChecked } = useSelector((state) => state.auth)
  const role = useSelector((state) => state.auth.user?.role)

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  if (roles && !sessionChecked) return <PageLoader className="min-h-screen" />

  if (roles && !roles.includes(role)) return fallback

  return children
}

export default RequireAuth
