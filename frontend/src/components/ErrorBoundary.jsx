import { Component } from 'react'
import { reportError } from '../utils/monitoring'

// Last line of defence: a crash in any page shows a recoverable screen instead of a blank one.
// Wraps the whole app (outside the router and store), so it only uses plain markup and full reloads.
// A lazy chunk that fails to download after a new deploy is the most common cause, and a reload fixes it.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack })
  }

  render() {
    if (!this.state.error) return this.props.children

    const chunkFailed = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(this.state.error.message ?? '')

    return (
      <div role="alert" className="grid min-h-screen place-items-center bg-ivory px-6 text-center text-ink">
        <div className="max-w-md">
          <p className="font-display text-3xl">
            good<em>things</em><span className="text-gold">.</span>
          </p>
          <h1 className="mt-10 font-display text-4xl">
            {chunkFailed ? 'A new version is available' : 'Something went wrong'}
          </h1>
          <p className="mt-4 leading-relaxed text-stone">
            {chunkFailed
              ? 'We updated the store while you were browsing. Reload the page to continue.'
              : 'An unexpected error stopped this page from loading. Your bag is saved. Please reload, or return to the home page.'}
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              Reload page
            </button>
            <a href="/" className="btn-outline">Go to home page</a>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
