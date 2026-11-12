import { describe, expect, it } from 'vitest'
import reducer, { addItem, changeQuantity, clearItem, isPurchasable, removeItem, removeUnavailable } from './slice'
import { fetchproduct } from './productSlice'
import { login, logout } from './authSlice'

const lamp = { id: 'lamp', title: 'Brass Lamp', price: 40, stock: 3, category: 'home', thumbnail: 'x.png', description: 'long text' }
const vase = { id: 'vase', title: 'Vase', price: 10, stock: 5, category: 'home', thumbnail: 'v.png' }
const empty = { items: [], storageKey: null }

const run = (...actions) => actions.reduce(reducer, empty)

describe('cart', () => {
  it('adds items and merges repeats', () => {
    const state = run(addItem({ ...lamp, quantity: 1 }), addItem({ ...lamp, quantity: 1 }))
    expect(state.items).toHaveLength(1)
    expect(state.items[0].quantity).toBe(2)
  })

  it('stores a small snapshot, not the whole product', () => {
    const state = run(addItem(lamp))
    expect(state.items[0].description).toBeUndefined()
    expect(state.items[0]).toMatchObject({ id: 'lamp', price: 40, stock: 3 })
  })

  it('never exceeds stock when adding or increasing', () => {
    let state = run(addItem({ ...lamp, quantity: 5 }))
    expect(state.items[0].quantity).toBe(3)
    state = reducer(state, changeQuantity({ id: 'lamp', change: 1 }))
    expect(state.items[0].quantity).toBe(3)
  })

  it('removes an item when its quantity reaches zero', () => {
    const state = run(addItem(vase), changeQuantity({ id: 'vase', change: -1 }))
    expect(state.items).toEqual([])
  })

  it('removes and clears', () => {
    expect(run(addItem(lamp), addItem(vase), removeItem({ id: 'lamp' })).items.map((item) => item.id)).toEqual(['vase'])
    expect(run(addItem(lamp), clearItem()).items).toEqual([])
  })

  it('syncs price and stock from a fresh catalogue, lowering quantities that no longer fit', () => {
    const state = run(
      addItem({ ...vase, quantity: 4 }),
      addItem(lamp),
      fetchproduct.fulfilled([{ ...vase, price: 12, stock: 2 }], 'req'),
    )
    const [syncedVase, missingLamp] = state.items
    expect(syncedVase).toMatchObject({ price: 12, stock: 2, quantity: 2, adjusted: true })
    expect(missingLamp.unavailable).toBe(true)
    expect(isPurchasable(missingLamp)).toBe(false)
    expect(reducer(state, removeUnavailable()).items.map((item) => item.id)).toEqual(['vase'])
  })

  it('treats sold-out items as not purchasable', () => {
    const state = run(addItem(vase), fetchproduct.fulfilled([{ ...vase, stock: 0 }], 'req'))
    expect(isPurchasable(state.items[0])).toBe(false)
  })

  it('merges the guest bag into the account bag on sign-in and empties it on sign-out', () => {
    let state = reducer({ items: [], storageKey: 'cart:guest' }, addItem(vase))
    state = reducer(state, login.fulfilled({ email: 'Jo@Example.com', firstName: 'Jo' }, 'req', {}))
    expect(state.storageKey).toBe('cart:jo@example.com')
    expect(state.items.map((item) => item.id)).toEqual(['vase'])

    state = reducer(state, logout.fulfilled(undefined, 'req'))
    expect(state).toEqual({ items: [], storageKey: 'cart:guest' })
  })
})
