import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import PageLoader from './components/PageLoader.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import StorefrontLayout from './components/StorefrontLayout.jsx'
import Toaster from './components/Toaster.jsx'
import { CookieConsent, OfflineBanner, RouteTracker } from './components/SiteNotices.jsx'
import { ADMIN_SECTIONS } from './components/admin/adminSections.js'
import { fetchproduct } from './toolkit/productSlice'
import { restoreSession } from './toolkit/authSlice'
import { fetchWishlist } from './toolkit/wishlistSlice'
import { isStaff, STAFF_ROLES } from './utils/roles'

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
const CheckoutComplete = lazy(() => import('./components/CheckoutComplete.jsx'))
const OrderPage = lazy(() => import('./components/OrderPage.jsx'))
const PolicyPage = lazy(() => import('./components/PolicyPage.jsx'))
const FaqPage = lazy(() => import('./components/FaqPage.jsx'))
const ContactPage = lazy(() => import('./components/ContactPage.jsx'))
const AdminLayout = lazy(() => import('./components/admin/AdminLayout.jsx'))
const AdminNotFound = lazy(() => import('./components/admin/AdminNotFound.jsx'))

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

// Customers get the storefront's 404, so the admin area is not advertised.
const adminFallback = (
  <StorefrontLayout>
    <NotFound />
  </StorefrontLayout>
)

function App() {
  const dispatch = useDispatch()
  const userId = useSelector((state) => state.auth.user?.id)
  const staff = useSelector((state) => isStaff(state.auth.user))

  useEffect(() => {
    dispatch(fetchproduct())
    dispatch(restoreSession())
  }, [dispatch])

  // Runs on load for a remembered session and again whenever a different customer signs in.
  // Admins and staff never shop, so they have no wishlist to load.
  useEffect(() => {
    if (userId && !staff) dispatch(fetchWishlist())
  }, [dispatch, userId, staff])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <RouteTracker />
      <OfflineBanner />
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
            <Route path="/checkout/complete" element={<RequireAuth><CheckoutComplete /></RequireAuth>} />
            <Route path="/about" element={<About />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
            <Route path="/account/orders/:id" element={<RequireAuth><OrderPage /></RequireAuth>} />
            <Route path="/wishlist" element={<RequireAuth><Wishlist /></RequireAuth>} />
            <Route path="/shipping" element={<PolicyPage page="shipping" />} />
            <Route path="/returns" element={<PolicyPage page="returns" />} />
            <Route path="/privacy" element={<PolicyPage page="privacy" />} />
            <Route path="/terms" element={<PolicyPage page="terms" />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin: its own shell with no storefront chrome; screens and their roles come from adminSections.js */}
          <Route path="/admin" element={<RequireAuth roles={STAFF_ROLES} fallback={adminFallback}><AdminLayout /></RequireAuth>}>
            {ADMIN_SECTIONS.map(({ path, roles, component: Screen }) => {
              const element = <RequireAuth roles={roles} fallback={<AdminNotFound />}><Screen /></RequireAuth>
              return path ? <Route key={path} path={path} element={element} /> : <Route key="index" index element={element} />
            })}
            <Route path="*" element={<AdminNotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
      <CookieConsent />
    </BrowserRouter>
  )
}

export default App
