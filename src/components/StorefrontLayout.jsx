import { lazy, Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Drawer } from '@mui/material'
import Header from './header.jsx'
import Footer from './Footer.jsx'
import PageLoader from './PageLoader.jsx'
import { closeCart } from '../toolkit/uiSlice'

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
// Admin accounts are management-only: any storefront URL sends them back to the dashboard.
function StorefrontLayout({ children }) {
  const isAdmin = useSelector((state) => state.auth.user?.role === 'admin')

  if (isAdmin) return <Navigate to="/admin" replace />

  return (
    <>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>{children ?? <Outlet />}</Suspense>
        </main>
        <Footer />
      </div>
      <CartDrawer />
    </>
  )
}

export default StorefrontLayout
