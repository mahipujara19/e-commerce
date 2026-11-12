/**
 * Google Analytics 4, loaded only after the visitor accepts analytics cookies.
 * Off entirely when VITE_GA_MEASUREMENT_ID is empty: no script, no cookies, no consent banner.
 *
 * Tracked: page views, view_item, add_to_cart, begin_checkout, purchase, sign_up, login, search.
 * Conversion rate by source and device comes from GA's own acquisition and device reports.
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || ''
const CONSENT_KEY = 'cookie-consent'

export const analyticsEnabled = Boolean(MEASUREMENT_ID)

let loaded = false

export const getConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY)
  } catch {
    return null
  }
}

const load = () => {
  if (loaded || !analyticsEnabled || typeof window === 'undefined') return
  loaded = true
  window.dataLayer = window.dataLayer || []
  // gtag must push the arguments object itself, which is why this is not an arrow function.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  // Page views are sent by the router (see trackPageView), not automatically.
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false, anonymize_ip: true })

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`
  document.head.appendChild(script)
}

export const setConsent = (value) => {
  try {
    localStorage.setItem(CONSENT_KEY, value)
  } catch {
    // Storage blocked: the choice applies to this visit only.
  }
  if (value === 'granted') load()
}

export const initAnalytics = () => {
  if (getConsent() === 'granted') load()
}

export const trackEvent = (name, params = {}) => {
  if (!loaded || !window.gtag) return
  window.gtag('event', name, params)
}

export const trackPageView = (path) => trackEvent('page_view', { page_path: path, page_location: window.location.href, page_title: document.title })

// GA4 ecommerce item shape.
export const gaItem = (product, quantity = 1) => ({
  item_id: product.id,
  item_name: product.title ?? product.name,
  item_brand: product.brand,
  item_category: product.category,
  price: product.price,
  quantity,
})
