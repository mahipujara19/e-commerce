import { lazy, Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Drawer } from '@mui/material'
import Header from './header.jsx'
import Footer from './Footer.jsx'
import PageLoader from './PageLoader.jsx'
import ScrollProgress from './ScrollProgress.jsx'
import { closeCart } from '../toolkit/uiSlice'
import { isStaff } from '../utils/roles'

const Addtocart = lazy(() => import('./Addtocart.jsx'))

function CartDrawer() {
  const dispatch = useDispatch()
  const open = useSelector((state) => state.ui.cartOpen)
  const close = () => dispatch(closeCart())

  return (
    <Drawer anchor="right" open={open} onClose={close} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}>
      <Suspense fallback={<PageLoader className="h-full" />}>
        <Addtocart onClose={close} />
      </Suspense>
    </Drawer>
  )
}

// Customer-facing chrome: header, footer and the bag drawer. The admin area has its own shell instead.
// `children` lets a single page (such as a 404) be shown inside the storefront without a nested route.
// Admin and staff accounts are management-only: any storefront URL sends them back to the dashboard,
// except the pages that email links open, which every account needs.
const SHARED_PATHS = ['/verify-email', '/reset-password', '/forgot-password']

function StorefrontLayout({ children }) {
  const staff = useSelector((state) => isStaff(state.auth.user))
  const { pathname } = useLocation()

  if (staff && !SHARED_PATHS.includes(pathname)) return <Navigate to="/admin" replace />

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <ScrollProgress />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {/* Keyed by page, so each new page fades in. */}
          <div key={pathname} className="animate-page-in">
            <Suspense fallback={<PageLoader />}>{children ?? <Outlet />}</Suspense>
          </div>
        </main>
        <Footer />
      </div>
      <CartDrawer />
    </>
  )
}

export default StorefrontLayout
