import { formatDate, moneyShort } from './format'

/**
 * Customer-facing wording for a coupon from GET /api/coupons. Purely descriptive: whether a code applies to a bag
 * (for example its minimum subtotal) is always decided by the server when the code is applied.
 */
export const describeCoupon = (coupon) => ({
  discount: coupon.type === 'percent' ? `${coupon.value}% off` : `${moneyShort(coupon.value)} off`,
  minimum: coupon.minSubtotal > 0 ? `On orders of ${moneyShort(coupon.minSubtotal)} or more` : 'No minimum spend',
  expires: coupon.expiresAt ? `Ends ${formatDate(coupon.expiresAt, { day: 'numeric', month: 'short', year: 'numeric' })}` : '',
})

// Copies a code to the clipboard. Resolves true when it worked; the caller shows the code to copy by hand otherwise.
export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
