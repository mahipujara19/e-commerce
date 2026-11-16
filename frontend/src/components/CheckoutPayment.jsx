import { useEffect, useRef, useState } from 'react'
import { Alert, CircularProgress } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import usePageMeta from '../hooks/usePageMeta'
import { fetchOrder } from '../toolkit/orderSlice'
import { api } from '../utils/api'
import { orderNumber } from '../utils/format'
import { loadStripe } from '../utils/stripe'
import { OrderItemList, OrderTotals } from './OrderDetails'

// Stripe allows one Embedded Checkout on a page at a time. Each mount waits until the previous one is destroyed
// (React's development mode mounts components twice).
let mountQueue = Promise.resolve()

/**
 * /checkout/pay?order=<id>: the card payment, on the store's own page (Stripe Embedded Checkout).
 *
 * The form is Stripe's: card details go straight to Stripe and never touch this site or its server. When the
 * payment succeeds, Stripe sends the customer to /checkout/complete?order=<id>, where the order is confirmed
 * (by the verified webhook, or by re-checking with Stripe). "Cancel payment" goes to the same page with
 * &cancelled=1, which releases the held stock. The bag is kept until the payment is confirmed.
 */
function CheckoutPayment() {
  usePageMeta({ title: 'Payment', noindex: true })
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const orderId = params.get('order') ?? ''
  const order = useSelector((state) => state.orders.byId[orderId])

  // Placing the order hands over the client secret; after a reload, or from the order page, it is fetched again.
  const handed = location.state?.orderId === orderId ? location.state.clientSecret : null
  const [secret, setSecret] = useState({ value: handed, error: null })
  const [form, setForm] = useState({ status: 'loading', error: null })
  const [attempt, setAttempt] = useState(0)
  const mountRef = useRef(null)

  useEffect(() => {
    if (orderId) dispatch(fetchOrder(orderId))
  }, [dispatch, orderId])

  useEffect(() => {
    if (secret.value || !orderId) return undefined
    let live = true
    api(`/orders/${orderId}/pay`, { method: 'POST' })
      .then(({ payment }) => {
        if (!live) return
        if (payment?.clientSecret) setSecret({ value: payment.clientSecret, error: null })
        // A session created before embedded payments were switched on: finish it on Stripe's page.
        else if (payment?.url) window.location.assign(payment.url)
        else setSecret({ value: null, error: 'Online payment is not available for this order.' })
      })
      .catch((error) => live && setSecret({ value: null, error: error.message }))
    return () => {
      live = false
    }
  }, [orderId, secret.value, attempt])

  useEffect(() => {
    if (!secret.value) return undefined
    let cancelled = false
    const mounted = mountQueue
      .then(async () => {
        if (cancelled) return null
        const stripe = await loadStripe()
        const checkout = await stripe.initEmbeddedCheckout({ fetchClientSecret: () => Promise.resolve(secret.value) })
        if (cancelled || !mountRef.current) {
          checkout.destroy()
          return null
        }
        checkout.mount(mountRef.current)
        setForm({ status: 'ready', error: null })
        return checkout
      })
      .catch((error) => {
        if (!cancelled) setForm({ status: 'failed', error: error.message })
        return null
      })
    mountQueue = mounted
    return () => {
      cancelled = true
      mountQueue = mounted.then((checkout) => checkout?.destroy())
    }
  }, [secret.value, attempt])

  const retry = () => {
    setForm({ status: 'loading', error: null })
    if (secret.error) setSecret({ value: null, error: null })
    setAttempt((value) => value + 1)
  }

  const cancelPayment = () => navigate(`/checkout/complete?order=${orderId}&cancelled=1`, { replace: true })

  const problem = secret.error ?? (form.status === 'failed' ? form.error : null)
  // Only "paid" counts: an unpaid cash-on-delivery order, a refund or a cancellation is handled by the server's answer.
  const paid = order?.payment?.status === 'paid'

  if (!orderId) {
    return (
      <div className="container-x py-20">
        <Alert severity="warning">This payment link is missing its order. <Link to="/account?tab=orders" className="underline">View your orders</Link></Alert>
      </div>
    )
  }

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Secure checkout</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Payment</h1>
        </div>
        <p className="text-sm text-stone">Order <span className="font-mono font-semibold tracking-wider text-ink">{orderNumber(orderId)}</span></p>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <section aria-labelledby="payment-form-title" className="min-w-0">
          <h2 id="payment-form-title" className="sr-only">Card details</h2>

          {paid ? (
            <Alert severity="success" action={<Link to={`/checkout/complete?order=${orderId}`} className="px-2 text-sm font-semibold underline">Continue</Link>}>
              This order has already been paid.
            </Alert>
          ) : problem ? (
            <Alert
              severity="error"
              action={
                <span className="flex flex-col items-end gap-1 sm:flex-row">
                  <button type="button" onClick={retry} className="whitespace-nowrap px-2 text-sm font-semibold underline">Try again</button>
                  <Link to="/cart" className="whitespace-nowrap px-2 text-sm font-semibold underline">Back to bag</Link>
                </span>
              }
            >
              {problem}
            </Alert>
          ) : (
            form.status === 'loading' && (
              <p className="flex items-center gap-3 py-10 text-sm text-stone" role="status">
                <CircularProgress size={18} color="inherit" /> Loading the secure payment form…
              </p>
            )
          )}

          {/* Stripe renders its form here. A light card keeps it readable in dark mode too. */}
          <div
            ref={mountRef}
            className={`overflow-hidden bg-white ring-1 ring-line ${form.status === 'ready' && !problem && !paid ? '' : 'hidden'}`}
          />

          <p className="mt-6 flex items-start gap-3 text-xs leading-relaxed text-stone">
            <LockOutlinedIcon sx={{ fontSize: 16 }} className="mt-0.5 shrink-0 text-gold" />
            <span>Payments are processed securely by Stripe. Your card details go straight to Stripe and are never stored by goodthings.</span>
          </p>
        </section>

        <aside className="lg:sticky lg:top-36 lg:self-start" aria-labelledby="payment-summary-title">
          <div className="bg-surface p-7 ring-1 ring-line sm:p-8">
            <h2 id="payment-summary-title" className="font-display text-2xl">Order summary</h2>
            {order ? (
              <>
                <div className="mt-6">
                  <OrderItemList items={order.items} linked={false} />
                </div>
                <div className="mt-6 border-t border-line pt-5">
                  <OrderTotals order={order} />
                </div>
              </>
            ) : (
              <div className="mt-6 space-y-3" aria-hidden="true">
                <div className="h-14 animate-pulse bg-sand" />
                <div className="h-24 animate-pulse bg-sand" />
              </div>
            )}
            {!paid && (
              <>
                <button type="button" onClick={cancelPayment} className="btn-outline mt-8 w-full">
                  Cancel payment
                </button>
                <p className="mt-3 text-xs leading-relaxed text-stone">
                  Cancelling releases the items held for this order. Your bag is kept, so you can check out again.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CheckoutPayment
