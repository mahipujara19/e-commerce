import { describe, expect, it } from 'vitest'
import { orderTotals } from '../../../backend/utils/orderTotals.js'
import { cartTotals, orderNumber, stockLevel } from './format'
import { toCsv } from './csv'
import { isStaff } from './roles'

const bag = (...lines) => lines.map(([price, quantity]) => ({ price, quantity }))

describe('cartTotals', () => {
  it('charges flat shipping below the free-shipping threshold', () => {
    expect(cartTotals(bag([20, 2]))).toMatchObject({ count: 2, subtotal: 40, shipping: 5.99, tax: 3.2, total: 49.19 })
  })

  it('ships free at the threshold and charges nothing for an empty bag', () => {
    expect(cartTotals(bag([75, 1])).shipping).toBe(0)
    expect(cartTotals([])).toMatchObject({ subtotal: 0, shipping: 0, tax: 0, total: 0 })
  })

  it('applies percent and fixed coupons, never below zero', () => {
    expect(cartTotals(bag([100, 1]), { type: 'percent', value: 10 })).toMatchObject({ discount: 10, shipping: 0, tax: 7.2, total: 97.2 })
    expect(cartTotals(bag([10, 1]), { type: 'fixed', value: 50 })).toMatchObject({ discount: 10, tax: 0, total: 5.99 })
  })

  it('judges free shipping after the discount', () => {
    // $80 − 10% = $72, under the $75 threshold
    expect(cartTotals(bag([80, 1]), { type: 'percent', value: 10 }).shipping).toBe(5.99)
  })

  it('avoids floating-point drift', () => {
    expect(cartTotals(bag([0.1, 3], [0.2, 1])).subtotal).toBe(0.5)
  })
})

// The bag shows the browser's numbers and the order uses the server's: they must never disagree.
describe('cart and order totals agree', () => {
  const cases = [
    [bag([19.99, 3])],
    [bag([74.99, 1])],
    [bag([12.5, 2], [33.33, 1]), { type: 'percent', value: 15 }],
    [bag([500, 1]), { type: 'fixed', value: 25 }],
    [bag([9.95, 7], [0.99, 13]), { type: 'percent', value: 33 }],
  ]

  it.each(cases)('for %j with coupon %j', (items, coupon = null) => {
    const browser = cartTotals(items, coupon)
    const server = orderTotals(items, coupon)
    expect(browser).toMatchObject({
      subtotal: server.subtotal,
      discount: server.discount,
      shipping: server.shipping,
      tax: server.tax,
      total: server.totalAmount,
    })
  })
})

describe('formatting helpers', () => {
  it('builds short order numbers', () => {
    expect(orderNumber('6af5421c432ac5ef2d2181f5')).toBe('GT-2D2181F5')
  })

  it('classifies stock levels', () => {
    expect([0, 3, 50].map(stockLevel)).toEqual(['out', 'low', 'ok'])
  })

  it('recognises staff roles', () => {
    expect([{ role: 'admin' }, { role: 'staff' }, { role: 'customer' }, null].map(isStaff)).toEqual([true, true, false, false])
  })
})

describe('toCsv', () => {
  it('quotes cells and escapes quotes', () => {
    expect(toCsv([['a', 'say "hi"'], [1, null]])).toBe('"a","say ""hi"""\r\n"1",""')
  })

  it('neutralises spreadsheet formulas', () => {
    expect(toCsv([['=HYPERLINK("x")', '+1', '-2', '@SUM(A1)']])).toBe(`"'=HYPERLINK(""x"")","'+1","'-2","'@SUM(A1)"`)
  })
})
