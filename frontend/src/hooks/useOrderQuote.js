import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../utils/api'

/**
 * Asks the server to price the bag: current prices, live stock, the coupon and, once a delivery address is known,
 * live carrier shipping and destination tax. Nothing is reserved.
 * Re-runs (debounced) whenever the bag, the coupon or the address changes.
 * Returns { quote, loading, error, refresh }. quote.issues lists items with too little stock;
 * quote.pricing says whether shipping and tax are estimates or came from a fallback.
 */
function useOrderQuote(items, couponCode, address = null) {
  const [state, setState] = useState({ quote: null, loading: true, error: '' })
  const [nonce, setNonce] = useState(0)
  const latest = useRef(0)

  // A stable key, so the effect only re-runs when ids or quantities actually change.
  const key = useMemo(
    () => JSON.stringify(items.map((item) => [item.id, item.quantity ?? 1]).sort()),
    [items],
  )

  const addressKey = address ? JSON.stringify(address) : ''

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
        if (latest.current === id) setState({ quote, loading: false, error: '' })
      } catch (error) {
        if (latest.current === id) setState((current) => ({ ...current, loading: false, error: error.message }))
      }
      // Longer while an address is being typed, so carriers are not asked on every keystroke.
    }, shippingAddress ? 700 : 250)

    return () => clearTimeout(timer)
  }, [key, couponCode, addressKey, nonce])

  const refresh = useCallback(() => setNonce((value) => value + 1), [])

  return { ...state, refresh }
}

export default useOrderQuote
