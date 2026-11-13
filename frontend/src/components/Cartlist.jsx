import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import { Alert } from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta'
import { changeQuantity, isPurchasable, removeItem, removeUnavailable } from '../toolkit/slice'
import { cartTotals, formatCategory } from '../utils/format'
import EmptyState from './EmptyState'
import FreeShippingMeter from './FreeShippingMeter'
import QuantityControl from './QuantityControl'
import Price, { CurrencyNote } from './Price'

function Cartlist() {
  const dispatch = useDispatch()
  const cartItems = useSelector((state) => state.cart.items)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const purchasable = cartItems.filter(isPurchasable)
  const unavailableCount = cartItems.length - purchasable.length
  const { count, subtotal, shipping, tax, total } = cartTotals(purchasable)

  usePageMeta({ title: 'Your bag', noindex: true })

  if (cartItems.length === 0) {
    return (
      <div className="container-x">
        <EmptyState
          icon={ShoppingBagOutlinedIcon}
          titleAs="h1"
          title="Your bag is empty"
          description="Discover pieces made to be kept — they'll wait for you here."
          action={<Link to="/" className="btn-primary">Discover the collection</Link>}
        />
      </div>
    )
  }

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Shopping bag</h1>
        </div>
        <p className="text-sm text-stone">{count} {count === 1 ? 'item' : 'items'}</p>
      </header>

      {unavailableCount > 0 && (
        <Alert
          severity="warning"
          className="mt-8"
          action={
            <button type="button" onClick={() => dispatch(removeUnavailable())} className="whitespace-nowrap px-2 text-sm font-semibold underline">
              Remove {unavailableCount === 1 ? 'it' : 'them'}
            </button>
          }
        >
          {unavailableCount === 1 ? 'One item in your bag is' : `${unavailableCount} items in your bag are`} no longer available and will not be ordered.
        </Alert>
      )}

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
        <ul className="divide-y divide-line">
          {cartItems.map((item) => {
            const quantity = item.quantity ?? 1
            const available = isPurchasable(item)
            const lowStock = available && item.stock != null && item.stock <= 5
            return (
              <li key={item.id} className={`flex gap-5 py-8 first:pt-0 sm:gap-8 ${available ? '' : 'opacity-60'}`}>
                <Link to={`/productitem/${item.id}`} className="h-36 w-28 shrink-0 bg-sand p-3 sm:h-44 sm:w-36">
                  <img src={item.thumbnail} alt={item.title} className="h-full w-full object-contain" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-stone">{item.brand || formatCategory(item.category)}</p>
                      <Link to={`/productitem/${item.id}`} className="mt-1.5 block font-display text-xl leading-snug hover:text-gold">
                        {item.title}
                      </Link>
                      <p className="mt-1 text-sm text-stone"><Price value={item.price} /> each</p>
                      {!available && (
                        <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400">
                          {item.unavailable ? 'No longer available' : 'Sold out'}
                        </p>
                      )}
                      {available && item.adjusted && (
                        <p className="mt-2 text-sm text-gold" role="status">Quantity reduced to the {item.stock} we have left</p>
                      )}
                      {lowStock && !item.adjusted && <p className="mt-2 text-sm text-gold">Only {item.stock} left</p>}
                    </div>
                    <p className="shrink-0 font-semibold"><Price value={item.price * quantity} /></p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
                    {available ? <QuantityControl
                      size="sm"
                      value={quantity}
                      label={item.title}
                      onDecrease={() => dispatch(changeQuantity({ id: item.id, change: -1 }))}
                      onIncrease={() => dispatch(changeQuantity({ id: item.id, change: 1 }))}
                      canIncrease={item.stock == null || quantity < item.stock}
                    /> : <span />}
                    <button
                      type="button"
                      onClick={() => dispatch(removeItem(item))}
                      aria-label={`Remove ${item.title} from bag`}
                      className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-stone underline-offset-4 hover:text-red-700 hover:underline"
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /> Remove
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="lg:sticky lg:top-28 lg:self-start" aria-labelledby="summary-title">
          <div className="bg-surface p-7 ring-1 ring-line sm:p-8">
            <h2 id="summary-title" className="font-display text-2xl">Order summary</h2>
            <div className="mt-6">
              <FreeShippingMeter subtotal={subtotal} />
            </div>
            <dl className="mt-8 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd><Price value={subtotal} /></dd></div>
              <div className="flex justify-between">
                <dt className="text-stone">Estimated shipping</dt>
                <dd aria-describedby="shipping-estimate-note">{shipping === 0 ? 'Complimentary' : <Price value={shipping} />}</dd>
              </div>
              <div className="flex justify-between"><dt className="text-stone">Estimated tax (8%)</dt><dd><Price value={tax} /></dd></div>
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <dt className="font-semibold uppercase tracking-[0.14em]">Total</dt>
                <dd className="font-display text-3xl"><Price value={total} /></dd>
              </div>
            </dl>
            {/* The bag uses the flat store rates; checkout prices shipping for the actual delivery address. */}
            <p id="shipping-estimate-note" className="mt-4 text-xs leading-relaxed text-stone">
              Shipping is an estimate and may change based on your delivery address. Your final shipping cost will be shown at checkout.
            </p>
            <CurrencyNote className="mt-2" />

            {!isAuthenticated && (
              <p className="mt-6 flex items-start gap-3 bg-sand p-4 text-sm leading-relaxed text-stone">
                <LockOutlinedIcon sx={{ fontSize: 18 }} className="mt-0.5 shrink-0 text-ink" />
                <span>
                  Checkout needs a free account, so you can track delivery, cancel or return in a click. Your bag comes with you
                  when you sign in.
                </span>
              </p>
            )}
            <Link
              to={isAuthenticated ? '/checkout' : '/login'}
              state={isAuthenticated ? undefined : { from: '/checkout' }}
              className={`btn-primary mt-6 w-full ${purchasable.length ? '' : 'pointer-events-none opacity-40'}`}
              aria-disabled={!purchasable.length}
            >
              {isAuthenticated ? 'Proceed to checkout' : 'Sign in to checkout'}
            </Link>
            <Link to="/" className="btn-outline mt-3 w-full">Continue shopping</Link>

            <ul className="mt-8 space-y-3 border-t border-line pt-6 text-xs text-stone">
              <li className="flex items-center gap-2"><LockOutlinedIcon sx={{ fontSize: 16 }} className="text-gold" /> Secure, encrypted checkout</li>
              <li className="flex items-center gap-2"><AutorenewRoundedIcon sx={{ fontSize: 16 }} className="text-gold" /> <Link to="/returns" className="hover:text-ink hover:underline">30-day returns</Link></li>
              <li className="flex items-center gap-2"><VerifiedOutlinedIcon sx={{ fontSize: 16 }} className="text-gold" /> Authenticity guaranteed</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Cartlist
