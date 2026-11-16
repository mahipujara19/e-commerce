import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import { CircularProgress } from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import useCartStockCheck from '../hooks/useCartStockCheck'
import usePageMeta from '../hooks/usePageMeta'
import { changeQuantity, fixStockIssues, isPurchasable, removeItem } from '../toolkit/slice'
import { notify } from '../toolkit/toastSlice'
import { cartTotals, formatCategory } from '../utils/format'
import EmptyState from './EmptyState'
import FreeShippingMeter from './FreeShippingMeter'
import QuantityControl from './QuantityControl'
import Price, { CurrencyNote } from './Price'
import { LineStockIssue, StockCheckStatus } from './StockCheck'

function Cartlist() {
  const dispatch = useDispatch()
  const cartItems = useSelector((state) => state.cart.items)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const purchasable = cartItems.filter(isPurchasable)
  const { count, subtotal, shipping, tax, total } = cartTotals(purchasable)
  const check = useCartStockCheck(cartItems)

  const fixAll = () => {
    dispatch(fixStockIssues(check.issues))
    dispatch(notify({ message: 'Your bag has been updated to what is in stock', severity: 'info' }))
  }

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

      <StockCheckStatus check={check} onFixAll={fixAll} className="mt-8" />

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
        <ul className="min-w-0 divide-y divide-line">
          {cartItems.map((item) => {
            const quantity = item.quantity ?? 1
            const issue = check.issueFor(item.id)
            const available = isPurchasable(item) && issue?.type !== 'unavailable' && issue?.available !== 0
            const lowStock = available && !issue && item.stock != null && item.stock <= 5
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
                      {issue ? (
                        <LineStockIssue
                          className="mt-2"
                          issue={issue}
                          quantity={quantity}
                          title={item.title}
                          onFix={() => dispatch(fixStockIssues([issue]))}
                        />
                      ) : !isPurchasable(item) ? (
                        <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400">
                          {item.unavailable ? 'No longer available' : 'Sold out'}
                        </p>
                      ) : null}
                      {!issue && available && item.adjusted && (
                        <p className="mt-2 text-sm text-gold" role="status">Quantity changed to the {item.stock} we have left</p>
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
                      className="inline-flex min-h-[44px] items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-stone underline-offset-4 hover:text-red-700 hover:underline sm:min-h-[32px]"
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /> Remove
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="lg:sticky lg:top-36 lg:self-start" aria-labelledby="summary-title">
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
            {/* Waits for a stock check that matches this bag and found nothing to fix. Checkout checks again, and the
                order reserves stock atomically, so this only stops a shopper heading into a checkout that would fail. */}
            <Link
              to={isAuthenticated ? '/checkout' : '/login'}
              state={isAuthenticated ? undefined : { from: '/checkout' }}
              className={`btn-primary mt-6 w-full ${purchasable.length && check.ready ? '' : 'pointer-events-none opacity-40'}`}
              aria-disabled={!purchasable.length || !check.ready}
              tabIndex={purchasable.length && check.ready ? undefined : -1}
            >
              {check.loading ? (
                <>
                  <CircularProgress size={14} color="inherit" /> Checking stock…
                </>
              ) : isAuthenticated ? 'Proceed to checkout' : 'Sign in to checkout'}
            </Link>
            <p className="sr-only" aria-live="polite">
              {check.loading ? 'Checking stock' : check.issues.length ? 'Some items need updating before checkout' : ''}
            </p>
            <Link to="/" className="btn-outline mt-3 w-full">Continue shopping</Link>

            <ul className="mt-8 space-y-3 border-t border-line pt-6 text-xs text-stone">
              <li className="flex items-center gap-2"><LockOutlinedIcon sx={{ fontSize: 16 }} className="text-gold" /> Secure, encrypted checkout</li>
              <li className="flex items-center gap-2"><AutorenewRoundedIcon sx={{ fontSize: 16 }} className="text-gold" /> <Link to="/returns" className="inline-flex min-h-[24px] items-center hover:text-ink hover:underline">30-day returns</Link></li>
              <li className="flex items-center gap-2"><VerifiedOutlinedIcon sx={{ fontSize: 16 }} className="text-gold" /> Authenticity guaranteed</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Cartlist
