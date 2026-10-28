import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Drawer } from '@mui/material'
import Header from './components/header.jsx'
import Footer from './components/Footer.jsx'
import Home from './components/Home.jsx'
import Addtocart from './components/Addtocart.jsx'
import Cartlist from './components/Cartlist.jsx'
import ProductItem from './components/ProductItem.jsx'
import SignupForm from './components/SignupForm.jsx'
import LoginForm from './components/LoginForm.jsx'
import CheckoutForm from './components/CheckoutForm.jsx'
import NotFound from './components/NotFound.jsx'
import About from './components/About.jsx'
import { fetchproduct } from './toolkit/productslice'
import { closeCart } from './toolkit/uiSlice'

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
      <Addtocart onClose={close} />
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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cart" element={<Cartlist />} />
            <Route path="/productitem/:id" element={<ProductItem />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/checkout" element={<CheckoutForm />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <CartDrawer />
    </BrowserRouter>
  )
}

export default App
