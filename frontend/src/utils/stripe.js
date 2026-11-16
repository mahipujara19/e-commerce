// Stripe.js for Embedded Checkout. Loaded from js.stripe.com on first use (Stripe requires it to come from there,
// never bundled), so pages that do not take payments never download it.
// The publishable key is public by design; the secret key never reaches the browser.
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

let loading = null

export const loadStripe = () => {
  if (!STRIPE_PUBLISHABLE_KEY) return Promise.reject(new Error('Card payments are not configured.'))
  loading ??= new Promise((resolve, reject) => {
    const ready = () => (window.Stripe ? resolve(window.Stripe(STRIPE_PUBLISHABLE_KEY)) : reject(new Error('Stripe could not start.')))
    if (window.Stripe) return ready()
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.async = true
    script.onload = ready
    script.onerror = () => {
      // Allow a later retry (for example after the connection comes back).
      loading = null
      script.remove()
      reject(new Error('The secure payment form could not load. Please check your connection and try again.'))
    }
    document.head.appendChild(script)
  })
  return loading
}
