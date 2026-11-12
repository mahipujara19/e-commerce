import { describe, expect, it } from 'vitest'
import { describeCoupon } from './coupons'
import { customerPaymentMethods, isOnlinePayment } from './payments'

describe('customerPaymentMethods', () => {
  it('offers only the methods the storefront can complete, in the store order', () => {
    const fromApi = [{ id: 'razorpay' }, { id: 'cod' }, { id: 'stripe' }]
    expect(customerPaymentMethods(fromApi).map((method) => method.id)).toEqual(['cod', 'stripe'])
  })

  it('offers nothing when the store only has Razorpay switched on', () => {
    expect(customerPaymentMethods([{ id: 'razorpay' }])).toEqual([])
    expect(customerPaymentMethods(undefined)).toEqual([])
  })

  it('treats only Stripe as an online payment', () => {
    expect(isOnlinePayment('stripe')).toBe(true)
    expect(isOnlinePayment('cod')).toBe(false)
    expect(isOnlinePayment('razorpay')).toBe(false)
  })
})

describe('describeCoupon', () => {
  it('describes a percent code with a minimum and an expiry', () => {
    const text = describeCoupon({ code: 'SPRING', type: 'percent', value: 25, minSubtotal: 50, expiresAt: '2030-03-31T00:00:00.000Z' })
    expect(text.discount).toBe('25% off')
    expect(text.minimum).toBe('On orders of $50 or more')
    expect(text.expires).toMatch(/^Ends .*2030/)
  })

  it('describes a fixed code without a minimum or expiry', () => {
    expect(describeCoupon({ code: 'FIVE', type: 'fixed', value: 5, minSubtotal: 0, expiresAt: null })).toEqual({
      discount: '$5 off',
      minimum: 'No minimum spend',
      expires: '',
    })
  })
})
