// Sends browser errors to the API (POST /api/client-errors), which writes them to the server log as JSON lines.
// sendBeacon survives page unloads and needs no CSRF token; the endpoint only logs, and is rate limited.
// To use a hosted tracker (Sentry, Datadog, ...) instead, call it from reportError.

const API_BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')}/api`
const MAX_REPORTS_PER_PAGE = 10
let sent = 0

export const reportError = (error, extra = {}) => {
  if (import.meta.env.DEV) {
    console.error('[monitoring]', error, extra)
    return
  }
  if (sent >= MAX_REPORTS_PER_PAGE || typeof navigator === 'undefined' || !navigator.sendBeacon) return
  sent += 1

  const payload = {
    message: String(error?.message ?? error).slice(0, 500),
    stack: String(error?.stack ?? '').slice(0, 4000),
    componentStack: extra.componentStack ? String(extra.componentStack).slice(0, 2000) : undefined,
    url: window.location.href.slice(0, 500),
    release: import.meta.env.VITE_RELEASE || undefined,
  }

  try {
    navigator.sendBeacon(`${API_BASE}/client-errors`, new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  } catch {
    // Reporting must never break the page.
  }
}

export const installGlobalErrorHandlers = () => {
  window.addEventListener('error', (event) => reportError(event.error ?? event.message))
  window.addEventListener('unhandledrejection', (event) => reportError(event.reason ?? 'Unhandled promise rejection'))
}
