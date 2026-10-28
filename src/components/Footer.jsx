import { Link, useLocation, useNavigate } from 'react-router-dom'
import { goToShop } from '../utils/format'

const YEAR = new Date().getFullYear()

const linkClass ='text-sm text-cream/60 transition-colors hover:text-cream'

function FooterColumn({ title, children, className = '' }) {
  return (
    <div className={className}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-light">{title}</h3>
      <ul className="mt-6 space-y-3.5">{children}</ul>
    </div>
  )
}

function Footer() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <footer className="bg-night text-cream">
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:gap-12 md:py-16 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:py-20">
        <div className="col-span-2 lg:col-span-1">
          <Link to="/" className="font-display text-3xl font-semibold tracking-tight">
            good<span className="font-normal italic">things</span>
            <span className="text-gold-light">.</span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/60">
            Jewellery, timepieces, fragrance and objects for the home — chosen to be kept for years, not seasons.
          </p>
          <div className="mt-8 flex flex-wrap gap-2" aria-label="Accepted payment methods">
            {['Visa', 'Mastercard', 'Amex', 'PayPal'].map((method) => (
              <span key={method} className="border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/70">
                {method}
              </span>
            ))}
          </div>
        </div>

        <FooterColumn title="Shop">
          <li>
            <button type="button" onClick={() => goToShop(navigate, pathname)} className={linkClass}>
              Shop all
            </button>
          </li>
          <li><Link to="/cart" className={linkClass}>Your bag</Link></li>
          <li><Link to="/checkout" className={linkClass}>Checkout</Link></li>
        </FooterColumn>

        <FooterColumn title="Company">
          <li><Link to="/about" className={linkClass}>Our story</Link></li>
          <li><Link to="/signup" className={linkClass}>Create account</Link></li>
          <li><Link to="/login" className={linkClass}>Sign in</Link></li>
        </FooterColumn>

        <FooterColumn title="Client care" className="col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-1">
          <li className="text-sm text-cream/60">Complimentary shipping over $75</li>
          <li className="text-sm text-cream/60">30-day returns</li>
          <li className="text-sm text-cream/60">Secure, encrypted checkout</li>
          <li className="text-sm text-cream/60">Concierge support, 7 days a week</li>
        </FooterColumn>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-cream/50 sm:flex-row sm:justify-between">
          <p>© {YEAR} goodthings. All rights reserved.</p>
          <p>Made to be kept.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
