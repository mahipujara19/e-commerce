import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Drawer } from '@mui/material'
import Header from './components/header.jsx'
import Footer from './components/Footer.jsx'
import PageLoader from './components/PageLoader.jsx'
import { fetchproduct } from './toolkit/productslice'
import { closeCart } from './toolkit/uiSlice'

// Each route (and the cart drawer contents) is its own chunk, downloaded on first visit.
const Home = lazy(() => import('./components/Home.jsx'))
const Addtocart = lazy(() => import('./components/Addtocart.jsx'))
const Shop = lazy(() => import('./components/Product.jsx'))
const Cartlist = lazy(() => import('./components/Cartlist.jsx'))
const ProductItem = lazy(() => import('./components/ProductItem.jsx'))
const SignupForm = lazy(() => import('./components/SignupForm.jsx'))
const LoginForm = lazy(() => import('./components/LoginForm.jsx'))
const CheckoutForm = lazy(() => import('./components/CheckoutForm.jsx'))
const NotFound = lazy(() => import('./components/NotFound.jsx'))
const About = lazy(() => import('./components/About.jsx'))

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return null
}

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

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(fetchproduct())
  }, [dispatch])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/cart" element={<Cartlist />} />
              <Route path="/productitem/:id" element={<ProductItem />} />
              <Route path="/signup" element={<SignupForm />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/checkout" element={<CheckoutForm />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
      <CartDrawer />
    </BrowserRouter>
  )
}

export default App
