import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { analyticsEnabled, getConsent, initAnalytics, setConsent, trackPageView } from '../utils/analytics'

export const OPEN_COOKIE_SETTINGS = 'open-cookie-settings'

// Asks before any analytics cookie is set. Only shown when analytics is configured (VITE_GA_MEASUREMENT_ID).
// The footer's "Cookie settings" link reopens it via the OPEN_COOKIE_SETTINGS window event.
export function CookieConsent() {
  const [open, setOpen] = useState(() => analyticsEnabled && !getConsent())

  useEffect(() => {
    initAnalytics()
    const reopen = () => setOpen(true)
    window.addEventListener(OPEN_COOKIE_SETTINGS, reopen)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, reopen)
  }, [])

  if (!open || !analyticsEnabled) return null

  const choose = (value) => {
    setConsent(value)
    setOpen(false)
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl animate-fade-up bg-surface p-5 shadow-2xl ring-1 ring-line sm:p-6"
    >
      <h2 id="cookie-title" className="font-display text-xl">Cookies</h2>
      <p className="mt-2 text-sm leading-relaxed text-stone">
        We use essential cookies to keep you signed in and your checkout secure. With your permission, we also use
        analytics cookies to understand how the store is used. <Link to="/privacy" className="underline">Privacy policy</Link>
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => choose('denied')} className="btn-outline !py-3">Essential only</button>
        <button type="button" onClick={() => choose('granted')} className="btn-primary !py-3">Accept analytics</button>
      </div>
    </section>
  )
}

// Tells shoppers when they lose their connection, instead of letting requests fail without explanation.
export function OfflineBanner() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (online) return null
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[1600] bg-red-700 px-4 py-2 text-center text-sm font-medium text-white">
      You are offline. Changes will not be saved until your connection returns.
    </div>
  )
}

// One analytics page view per route change.
export function RouteTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    // After the page has set its title.
    const timer = setTimeout(() => trackPageView(pathname), 0)
    return () => clearTimeout(timer)
  }, [pathname])
  return null
}
