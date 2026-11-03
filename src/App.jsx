import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import PageLoader from './components/PageLoader.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import StorefrontLayout from './components/StorefrontLayout.jsx'
import Toaster from './components/Toaster.jsx'
import { ADMIN_SECTIONS } from './components/admin/adminSections.js'
import { fetchproduct } from './toolkit/productslice'
import { restoreSession } from './toolkit/authSlice'
import { fetchWishlist } from './toolkit/wishlistSlice'

// Each route is its own chunk, downloaded on first visit.
const Home = lazy(() => import('./components/Home.jsx'))
const Shop = lazy(() => import('./components/Product.jsx'))
const Cartlist = lazy(() => import('./components/Cartlist.jsx'))
const ProductItem = lazy(() => import('./components/ProductItem.jsx'))
const SignupForm = lazy(() => import('./components/SignupForm.jsx'))
const LoginForm = lazy(() => import('./components/LoginForm.jsx'))
const CheckoutForm = lazy(() => import('./components/CheckoutForm.jsx'))
const NotFound = lazy(() => import('./components/NotFound.jsx'))
const About = lazy(() => import('./components/About.jsx'))
const Account = lazy(() => import('./components/Account.jsx'))
const Wishlist = lazy(() => import('./components/Wishlist.jsx'))
const ForgotPassword = lazy(() => import('./components/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./components/ResetPassword.jsx'))
const VerifyEmail = lazy(() => import('./components/VerifyEmail.jsx'))
const AdminLayout = lazy(() => import('./components/admin/AdminLayout.jsx'))
const AdminNotFound = lazy(() => import('./components/admin/AdminNotFound.jsx'))

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

// Non-admins get the storefront's 404, so the admin area is not advertised.
const adminFallback = (
  <StorefrontLayout>
    <NotFound />
  </StorefrontLayout>
)

function App() {
  const dispatch = useDispatch()
  const userId = useSelector((state) => state.auth.user?.id)
  const isAdmin = useSelector((state) => state.auth.user?.role === 'admin')

  useEffect(() => {
    dispatch(fetchproduct())
    dispatch(restoreSession())
  }, [dispatch])

  // Runs on load for a remembered session and again whenever a different customer signs in.
  // Admins never shop, so they have no wishlist to load.
  useEffect(() => {
    if (userId && !isAdmin) dispatch(fetchWishlist())
  }, [dispatch, userId, isAdmin])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader className="min-h-screen" />}>
        <Routes>
          {/* Storefront: everything customers see, wrapped in the header, footer and bag drawer */}
          <Route element={<StorefrontLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/cart" element={<Cartlist />} />
            <Route path="/productitem/:id" element={<ProductItem />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/checkout" element={<CheckoutForm />} />
            <Route path="/about" element={<About />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="/wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin: its own shell with no storefront chrome; screens come from adminSections.js */}
          <Route path="/admin" element={<RequireAuth admin fallback={adminFallback}><AdminLayout /></RequireAuth>}>
            {ADMIN_SECTIONS.map(({ path, component: Screen }) =>
              path ? <Route key={path} path={path} element={<Screen />} /> : <Route key="index" index element={<Screen />} />,
            )}
            <Route path="*" element={<AdminNotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  )
}

export default App
