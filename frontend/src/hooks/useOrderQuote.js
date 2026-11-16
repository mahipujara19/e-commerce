import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../utils/api'

// Returning to the tab after this long re-checks prices and stock.
const REFRESH_AFTER_HIDDEN_MS = 30 * 1000

/**
 * Asks the server to price the bag: current prices, live stock, the coupon and, once a delivery address is known,
 * live carrier shipping and destination tax. Nothing is reserved: stock is only claimed when the order is placed.
 * Re-runs (debounced) whenever the bag, the coupon or the address changes, and when the shopper comes back to the
 * tab after a while. Responses for an older bag are ignored.
 *
 * Returns { quote, loading, error, refresh, checkedAt }. quote.issues lists items with too little stock;
 * quote.pricing says whether shipping and tax are estimates or came from a fallback.
 * `loading` stays true until the quote matches the current bag, so a quote for a previous bag never counts as current.
 */
function useOrderQuote(items, couponCode, address = null, { onQuote } = {}) {
  const [state, setState] = useState({ quote: null, loading: true, error: '', forKey: null, checkedAt: 0 })
  const [nonce, setNonce] = useState(0)
  const latest = useRef(0)
  // Kept in a ref so a new callback each render does not restart the debounced request.
  const onQuoteRef = useRef(onQuote)
  useEffect(() => {
    onQuoteRef.current = onQuote
  }, [onQuote])

  // A stable key, so the effect only re-runs when ids or quantities actually change.
  const key = useMemo(
    () => JSON.stringify(items.map((item) => [item.id, item.quantity ?? 1]).sort()),
    [items],
  )

  const addressKey = address ? JSON.stringify(address) : ''
  const requestKey = `${key}|${couponCode ?? ''}|${addressKey}`

  useEffect(() => {
    const lines = JSON.parse(key)
    const shippingAddress = addressKey ? JSON.parse(addressKey) : undefined
    if (!lines.length) return undefined

    const id = ++latest.current
    const timer = setTimeout(async () => {
      setState((current) => ({ ...current, loading: true, error: '' }))
      try {
        const quote = await api('/orders/quote', {
          method: 'POST',
          body: { items: lines.map(([product, quantity]) => ({ product, quantity })), couponCode: couponCode || undefined, shippingAddress },
        })
        if (latest.current !== id) return
        setState({ quote, loading: false, error: '', forKey: requestKey, checkedAt: Date.now() })
        onQuoteRef.current?.(quote, lines.map(([product]) => product))
      } catch (error) {
        if (latest.current === id) setState((current) => ({ ...current, loading: false, error: error.message, forKey: null }))
      }
      // Longer while an address is being typed, so carriers are not asked on every keystroke.
    }, shippingAddress ? 700 : 250)

    return () => clearTimeout(timer)
  }, [key, couponCode, addressKey, nonce]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(() => setNonce((value) => value + 1), [])

  // Stock can sell out while the shopper is in another tab, so check again when they come back.
  const checkedAt = state.checkedAt
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && checkedAt && Date.now() - checkedAt > REFRESH_AFTER_HIDDEN_MS) refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [checkedAt, refresh])

  const hasItems = key !== '[]'
  return {
    quote: state.quote,
    loading: hasItems && !state.error && (state.loading || state.forKey !== requestKey),
    error: state.error,
    refresh,
    checkedAt,
  }
}

export default useOrderQuote
