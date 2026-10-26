import Header from './components/header.jsx'
import Product from './components/Product'
import Addtocart from './components/Addtocart'
import './App.css'

function App() {
  return (
    <div className="storefront">
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

        <div className="shop-layout">
          <Product />
          <Addtocart />
        </div>
      </main>

      <footer className="store-footer">
        <span>Made for the everyday.</span>
        <span>Free shipping on orders over $75</span>
      </footer>
    </div>
  )
}

export default App
