import { Alert } from '@mui/material'

// What the stock check found for one line, in words, and the one-click fix for it.
const describeIssue = (issue, quantity) => {
  if (issue.type === 'unavailable') return { text: 'No longer available', fix: 'Remove' }
  if (issue.available === 0) return { text: 'Sold out', fix: 'Remove' }
  return { text: `Only ${issue.available} left. You have ${quantity} in your bag.`, fix: `Change to ${issue.available}` }
}

// One bag line's stock problem with its one-click fix. Shared by the bag page, the bag drawer and checkout.
export function LineStockIssue({ issue, quantity, title, onFix, className = '' }) {
  const { text, fix } = describeIssue(issue, quantity)
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${className}`}>
      <p className="font-semibold text-red-700 dark:text-red-400">{text}</p>
      <button
        type="button"
        onClick={onFix}
        className="inline-flex min-h-[44px] items-center font-semibold underline underline-offset-4 hover:text-gold sm:min-h-0"
      >
        {fix}
        <span className="sr-only"> {title}</span>
      </button>
    </div>
  )
}

// Bag-level status from useCartStockCheck: could not check (with retry), or how many lines need fixing.
export function StockCheckStatus({ check, onFixAll, className = '' }) {
  if (check.error) {
    return (
      <Alert
        severity="error"
        className={className}
        action={<button type="button" onClick={check.refresh} className="whitespace-nowrap px-2 text-sm font-semibold underline">Try again</button>}
      >
        We couldn&apos;t check stock right now, so checkout is paused. {check.error}
      </Alert>
    )
  }
  if (check.issues.length) {
    const one = check.issues.length === 1
    return (
      <Alert
        severity="warning"
        className={className}
        action={<button type="button" onClick={onFixAll} className="whitespace-nowrap px-2 text-sm font-semibold underline">Update my bag</button>}
      >
        {one ? 'One item in your bag has' : `${check.issues.length} items in your bag have`} changed since you added {one ? 'it' : 'them'}.
        Update your bag to continue.
      </Alert>
    )
  }
  return null
}
