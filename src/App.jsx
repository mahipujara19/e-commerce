import Header from './components/header.jsx'
import Product from './components/Product'
import Addtocart from './components/Addtocart'
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Cartlist from './components/Cartlist.jsx'
import ProductItem from './components/ProductItem.jsx'
import SignupForm from './components/SignupForm.jsx'
import LoginForm from './components/LoginForm.jsx'
import CheckoutForm from './components/CheckoutForm.jsx'
import NotFound from './components/NotFound.jsx'
import About from './components/About.jsx'

/**
 * App — Root component that defines the page layout and all routes.
 *
 * E-commerce flow:
 * 1. Browse products (/) — anyone can do this, no login required
 * 2. View product detail (/productitem/:id) — no login required
 * 3. Add to cart — no login required (cart stored in Redux + localStorage)
 * 4. Review cart (/cart) — no login required
 * 5. Checkout (/checkout) — REQUIRES authentication
 *    → If not logged in, redirects to /login with return to /checkout
 *    → After login/signup, returns to /checkout
 *
 * Routes:
 * - /                   → Home page with product grid + cart sidebar
 * - /cart               → Full cart review page
 * - /productitem/:id    → Single product detail page
 * - /signup             → User registration (Formik + Yup + reCAPTCHA + honeypot)
 * - /login              → User sign-in form
 * - /checkout           → Checkout (auth-gated, geolocation, saved addresses)
 * - *                   → Custom 404 page for any unmatched routes
 */
function App() {
  return (

    <div className="storefront">
      <BrowserRouter>
      <Header />

      <main className="page-content">
        {/* Hero banner — welcoming message at the top of every page */}
        <section className="welcome-banner" aria-label="Store introduction">
          <div className="welcome-copy">
            <span className="eyebrow">THE EVERYDAY EDIT</span>
            <h1>Little things.<br />Better living.</h1>
            <p>Thoughtful essentials for slower mornings and softer landings.</p>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <span className="art-orbit art-orbit-one" />
            <span className="art-orbit art-orbit-two" />
            <span className="art-sun" />
            <span className="art-vase art-vase-large" />
            <span className="art-vase art-vase-small" />
          </div>
          <span className="banner-note">MADE TO BE KEPT</span>
        </section>

        <Routes>
          {/* Home — product grid with cart sidebar */}
          <Route
            path="/"
            element={
              <div className="shop-layout">
                <Product />
                <Addtocart />
              </div>
            }
          />
          {/* Cart review page */}
          <Route path="/cart" element={<Cartlist />} />
          {/* Single product detail */}
          <Route path="/productitem/:id" element={<ProductItem />} />
          {/* Signup form — Formik + Yup + honeypot + reCAPTCHA */}
          <Route path="/signup" element={<SignupForm />} />
          {/* Login form — email + password, redirects after auth */}
          <Route path="/login" element={<LoginForm />} />
          {/* Checkout — auth-gated, geolocation, saved addresses, payment */}
          <Route path="/checkout" element={<CheckoutForm />} />
          {/* About — brand story and values */}
          <Route path="/about" element={<About />} />
          {/* 404 — catches all unmatched routes */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="store-footer">
        <span>Made for the everyday.</span>
        <span>Free shipping on orders over $75</span>
      </footer>
      </BrowserRouter>
    </div>
  )
}

export default App
