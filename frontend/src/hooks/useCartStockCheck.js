import { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import { syncWithQuote } from '../toolkit/slice'
import useOrderQuote from './useOrderQuote'

/**
 * Live stock for the bag: runs the server quote when the bag opens, whenever its items or quantities change, and
 * when the shopper returns to the tab, then copies current prices and stock into the stored bag.
 * A quote is a check, not a reservation: the order itself re-checks and reserves stock atomically.
 *
 * Returns { issues, issueFor(id), loading, error, refresh, ready }. `ready` is true only when the latest check
 * matches the current bag and found nothing to fix, which is what a "proceed to checkout" button should wait for.
 */
function useCartStockCheck(items, { couponCode = null, address = null } = {}) {
  const dispatch = useDispatch()
  const onQuote = useCallback((quote, checked) => dispatch(syncWithQuote({ quote, checked })), [dispatch])
  const { quote, loading, error, refresh } = useOrderQuote(items, couponCode, address, { onQuote })

  // Only issues for lines still in the bag: a line removed a moment ago must not keep blocking checkout.
  const issues = useMemo(() => {
    const ids = new Set(items.map((item) => item.id))
    return (quote?.issues ?? []).filter((issue) => ids.has(issue.product))
  }, [quote, items])

  const issueFor = useCallback((id) => issues.find((issue) => issue.product === id), [issues])

  return { quote, issues, issueFor, loading, error, refresh, ready: items.length > 0 && !loading && !error && Boolean(quote) && issues.length === 0 }
}

export default useCartStockCheck
