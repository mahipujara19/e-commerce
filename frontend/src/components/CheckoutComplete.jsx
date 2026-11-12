import { useEffect, useRef, useState } from 'react'
import { Alert, CircularProgress } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { Link, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import usePageMeta from '../hooks/usePageMeta'
import { cancelMyOrder, fetchOrder } from '../toolkit/orderSlice'
import { fetchproduct } from '../toolkit/productSlice'
import { clearItem } from '../toolkit/slice'
import { trackEvent } from '../utils/analytics'
import { CURRENCY, formatDate, orderNumber } from '../utils/format'
import { CheckoutSteps } from './CheckoutForm'
import { OrderItemList, OrderTotals } from './OrderDetails'
import PageLoader from './PageLoader'

const POLL_INTERVAL_MS = 2000
const MAX_POLLS = 10

// Sends the GA purchase event once per order, even across reloads of this page.
const trackPurchaseOnce = (order) => {
  try {
    const key = `purchase-tracked:${order.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    // Storage blocked: may track twice on reload, which GA de-duplicates by transaction_id.
  }
  trackEvent('purchase', {
    transaction_id: order.id,
    currency: CURRENCY,
    value: order.totalAmount,
    tax: order.tax,
    shipping: order.shipping,
    coupon: order.couponCode,
    items: order.items.map((item) => ({ item_id: item.product, item_name: item.name, price: item.price, quantity: item.quantity })),
  })
}

/**
 * /checkout/complete?order=<id>[&cancelled=1] — where customers land after placing an order or after leaving Stripe.
 * Paid (or pay-on-delivery): thank-you page; the bag is emptied now, not before, so an abandoned payment keeps it.
 * Payment cancelled (Stripe "back"): the held stock is released straight away (the server
 * first checks no payment went through) and the bag is still there to try again.
 * Still processing: polls for a short while, since Stripe's confirmation can arrive a moment after the redirect.
 */
function CheckoutComplete() {
  const dispatch = useDispatch()
  const [params] = useSearchParams()
  const orderId = params.get('order')
  const cancelledOnStripe = params.get('cancelled') === '1'
  const user = useSelector((state) => state.auth.user)
  const order = useSelector((state) => state.orders.byId[orderId])
  const [error, setError] = useState('')
  const [polls, setPolls] = useState(0)
  const handled = useRef(false)

  usePageMeta({ title: 'Order confirmation', noindex: true })

  useEffect(() => {
    if (!orderId) return
    dispatch(fetchOrder(orderId))
      .unwrap()
      .catch((message) => setError(message))
  }, [dispatch, orderId])

  const paymentStatus = order?.payment?.status
  const confirmed = order && order.status !== 'cancelled' && paymentStatus !== 'awaiting_payment'

  // Leaving Stripe without paying: release the reserved stock now rather than in 30 minutes.
  useEffect(() => {
    if (!cancelledOnStripe || !order || handled.current || paymentStatus !== 'awaiting_payment') return
    handled.current = true
    dispatch(cancelMyOrder(order.id))
  }, [cancelledOnStripe, order, paymentStatus, dispatch])

  useEffect(() => {
    if (!confirmed || handled.current) return
    handled.current = true
    dispatch(clearItem())
    dispatch(fetchproduct({ force: true }))
    trackPurchaseOnce(order)
  }, [confirmed, order, dispatch])

  // Paid on Stripe but not confirmed yet: check again a few times.
  useEffect(() => {
    if (cancelledOnStripe || paymentStatus !== 'awaiting_payment' || polls >= MAX_POLLS) return undefined
    const timer = setTimeout(() => {
      dispatch(fetchOrder(orderId))
      setPolls((count) => count + 1)
    }, POLL_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [cancelledOnStripe, paymentStatus, polls, dispatch, orderId])

  if (!orderId) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-4xl">No order to show</h1>
        <Link to="/account?tab=orders" className="btn-primary mt-10">View your orders</Link>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="container-x py-24">
        <Alert severity="error" action={<Link to="/account?tab=orders" className="px-2 text-sm font-semibold underline">Your orders</Link>}>
          We could not load this order: {error}
        </Alert>
      </div>
    )
  }

  if (!order) return <PageLoader />

  if (order.status === 'cancelled' || (cancelledOnStripe && paymentStatus === 'awaiting_payment')) {
    return (
      <div className="container-x py-16 md:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="font-display text-4xl leading-tight md:text-5xl">Payment not completed</h1>
          <p className="mx-auto mt-5 max-w-md leading-relaxed text-stone">
            You have not been charged. Your bag is saved, so you can try again whenever you are ready.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/checkout" className="btn-primary">Return to checkout</Link>
            <Link to="/cart" className="btn-outline">View bag</Link>
          </div>
        </div>
      </div>
    )
  }

  if (paymentStatus === 'awaiting_payment') {
    return (
      <div className="container-x py-24 text-center" role="status">
        {polls < MAX_POLLS ? (
          <>
            <CircularProgress sx={{ color: 'rgb(var(--gold))' }} />
            <h1 className="mt-8 font-display text-3xl">Confirming your payment…</h1>
            <p className="mt-3 text-stone">This usually takes a few seconds. Please keep this page open.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl">Your payment is still processing</h1>
            <p className="mx-auto mt-3 max-w-md text-stone">
              We will email {order.shippingAddress.email} as soon as it is confirmed. You can also follow it from your account.
            </p>
            <Link to={`/account/orders/${order.id}`} className="btn-primary mt-8">View order</Link>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="container-x py-16 md:py-24">
      <div className="mx-auto max-w-2xl animate-fade-up">
        <div className="flex justify-center"><CheckoutSteps current={3} /></div>
        <div className="mt-12 text-center">
          <CheckCircleRoundedIcon sx={{ fontSize: 72 }} className="text-gold" />
          <h1 className="mt-6 font-display text-4xl leading-tight md:text-5xl">Thank you, {user?.firstName ?? order.shippingAddress.fullName.split(' ')[0]}</h1>
          <p className="mx-auto mt-5 max-w-md leading-relaxed text-stone">
            {paymentStatus === 'paid' ? 'Your payment was received and your order is confirmed.' : 'Your order is confirmed and will be paid on delivery.'}{' '}
            A confirmation is on its way to <strong className="text-ink">{order.shippingAddress.email}</strong>.
          </p>
        </div>

        <div className="mt-10 bg-surface p-6 ring-1 ring-line sm:p-8">
          <div className="flex flex-wrap justify-between gap-4 border-b border-line pb-5 text-sm">
            <p>Order <strong className="ml-1 font-mono tracking-wider">{orderNumber(order.id)}</strong></p>
            {order.estimatedDelivery && <p className="text-stone">Estimated delivery <strong className="text-ink">{formatDate(order.estimatedDelivery, { weekday: 'short', day: 'numeric', month: 'short' })}</strong></p>}
          </div>
          <div className="mt-6"><OrderItemList items={order.items} /></div>
          <div className="mt-6 border-t border-line pt-6"><OrderTotals order={order} /></div>
        </div>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to={`/account/orders/${order.id}`} className="btn-primary">Track your order</Link>
          <Link to="/shop" className="btn-outline">Continue shopping</Link>
        </div>
      </div>
    </div>
  )
}

export default CheckoutComplete
