import { useEffect, useState } from 'react'
import { api } from '../utils/api'

// Promo codes customers can use right now (GET /api/coupons). null while loading; [] when there are none or the
// list could not be loaded, since offers are a nice-to-have and never block shopping.
export default function useCouponOffers() {
  const [offers, setOffers] = useState(null)
  useEffect(() => {
    let active = true
    api('/coupons')
      .then((data) => active && setOffers(Array.isArray(data) ? data : []))
      .catch(() => active && setOffers([]))
    return () => {
      active = false
    }
  }, [])
  return offers
}
