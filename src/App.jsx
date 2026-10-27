import Header from './components/header.jsx'
import Product from './components/Product'
import Addtocart from './components/Addtocart'
import './App.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Cartlist from './components/Cartlist.jsx'
import ProductItem from './components/ProductItem.jsx'

function App() {
  return (

    <div className="storefront">
      <BrowserRouter>
      <Header />

      <main className="page-content">
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
          <Route
            path="/"
            element={
              <div className="shop-layout">
                <Product />
                <Addtocart />
              </div>
            }
          />
          <Route path="/cart" element={<Cartlist />} />
          <Route path="/productitem/:id" element={<ProductItem />} />
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
