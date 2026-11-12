import { Link } from 'react-router-dom'
import { analyticsEnabled } from '../utils/analytics'
import { STORE } from '../utils/storeInfo'
import { OPEN_COOKIE_SETTINGS } from './SiteNotices'
import { FREE_SHIPPING_TEXT } from '../utils/format'

const YEAR = new Date().getFullYear()

// Shown under "We accept". Set VITE_PAYMENT_BADGES to match what your Stripe account actually offers.
const PAYMENT_BADGES = (import.meta.env.VITE_PAYMENT_BADGES ?? 'Visa,Mastercard,Amex,Apple Pay,Google Pay')
  .split(',')
  .map((badge) => badge.trim())
  .filter(Boolean)

const linkClass = 'inline-block py-1 text-sm text-cream/70 transition-colors hover:text-cream'

function FooterColumn({ title, children, className = '' }) {
  return (
    <nav className={className} aria-label={title}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gold-light">{title}</h3>
      <ul className="mt-5 space-y-1.5">{children}</ul>
    </nav>
  )
}

function Footer() {
  return (
    <footer className="bg-night text-cream">
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-4 md:gap-12 md:py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:py-20">
        <div className="col-span-2 md:col-span-4 lg:col-span-1">
          <Link to="/" className="font-display text-3xl font-semibold tracking-tight">
            good<span className="font-normal italic">things</span>
            <span className="text-gold-light">.</span>
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-cream/70">
            Jewellery, timepieces, fragrance and objects for the home — chosen to be kept for years, not seasons.
          </p>
          {PAYMENT_BADGES.length > 0 && (
            <div className="mt-8">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cream/60">We accept</p>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Accepted payment methods">
                {PAYMENT_BADGES.map((method) => (
                  <li key={method} className="border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/80">
                    {method}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <FooterColumn title="Shop">
          <li><Link to="/shop" className={linkClass}>Shop all</Link></li>
          <li><Link to="/wishlist" className={linkClass}>Wishlist</Link></li>
          <li><Link to="/cart" className={linkClass}>Your bag</Link></li>
          <li><Link to="/about" className={linkClass}>Our story</Link></li>
        </FooterColumn>

        <FooterColumn title="Help">
          <li><Link to="/contact" className={linkClass}>Contact us</Link></li>
          <li><Link to="/faq" className={linkClass}>FAQ</Link></li>
          <li><Link to="/account?tab=orders" className={linkClass}>Track an order</Link></li>
          <li><Link to="/shipping" className={linkClass}>Shipping</Link></li>
          <li><Link to="/returns" className={linkClass}>Returns &amp; refunds</Link></li>
        </FooterColumn>

        <FooterColumn title="Legal" className="col-span-2 sm:col-span-1">
          <li><Link to="/terms" className={linkClass}>Terms of sale</Link></li>
          <li><Link to="/privacy" className={linkClass}>Privacy policy</Link></li>
          {analyticsEnabled && (
            <li>
              <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))} className={linkClass}>
                Cookie settings
              </button>
            </li>
          )}
          {STORE.supportEmail && (
            <li className="pt-3">
              <a href={`mailto:${STORE.supportEmail}`} className={`${linkClass} break-all`}>{STORE.supportEmail}</a>
            </li>
          )}
          {STORE.supportPhone && <li><a href={`tel:${STORE.supportPhone.replace(/[^\d+]/g, '')}`} className={linkClass}>{STORE.supportPhone}</a></li>}
        </FooterColumn>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-6 text-xs text-cream/60 sm:flex-row sm:justify-between">
          <p>© {YEAR} {STORE.legalName}. All rights reserved.{STORE.address ? ` ${STORE.address}` : ''}</p>
          <p>{FREE_SHIPPING_TEXT} · 30-day returns</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
