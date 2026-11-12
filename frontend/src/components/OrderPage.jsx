import { useEffect, useState } from 'react'
import { Alert, CircularProgress } from '@mui/material'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import { Link, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import usePageMeta from '../hooks/usePageMeta'
import { cancelMyOrder, fetchOrder } from '../toolkit/orderSlice'
import { fetchproduct } from '../toolkit/productSlice'
import { api } from '../utils/api'
import { formatDate, money, orderNumber } from '../utils/format'
import ConfirmDialog from './ConfirmDialog'
import { OrderItemList, OrderStatusBadge, OrderTimeline, OrderTotals, PaymentBadge } from './OrderDetails'
import PageLoader from './PageLoader'

const label = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-stone'

function OrderPage({ id }) {
  const dispatch = useDispatch()
  const order = useSelector((state) => state.orders.byId[id])
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  usePageMeta({ title: order ? `Order ${orderNumber(order.id)}` : 'Your order', noindex: true })

  useEffect(() => {
    dispatch(fetchOrder(id))
      .unwrap()
      .catch((message) => setError(message))
  }, [dispatch, id])

  const cancel = async () => {
    setConfirming(false)
    setCancelling(true)
    try {
      await dispatch(cancelMyOrder(id)).unwrap()
      dispatch(fetchproduct({ force: true }))
    } catch {
      // Reported by the toast listener
    } finally {
      setCancelling(false)
    }
  }

  const resumePayment = async () => {
    setPaying(true)
    setPayError('')
    try {
      const { payment } = await api(`/orders/${id}/pay`, { method: 'POST' })
      if (payment?.provider === 'stripe' && payment.url) {
        window.location.assign(payment.url)
        return
      }
      setPayError('Online payment for this order is not available. Please cancel it and order again, or contact us.')
      await dispatch(fetchOrder(id))
    } catch (requestError) {
      setPayError(requestError.message)
    }
    setPaying(false)
  }

  if (error && !order) {
    return (
      <div className="container-x py-20">
        <Alert
          severity="error"
          action={<button type="button" onClick={() => dispatch(fetchOrder(id))} className="px-2 text-sm font-semibold underline">Retry</button>}
        >
          We could not load this order: {error}
        </Alert>
        <Link to="/account?tab=orders" className="btn-outline mt-8">Back to your orders</Link>
      </div>
    )
  }

  if (!order) return <PageLoader />

  const address = order.shippingAddress
  const awaitingPayment = order.payment?.status === 'awaiting_payment' && order.status === 'pending'
  // Older orders may have been started with Razorpay, which this storefront no longer opens; they can be cancelled.
  const canResumePayment = order.payment?.provider !== 'razorpay'

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <Link to="/account?tab=orders" className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone hover:text-ink">
        <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} /> All orders
      </Link>

      <header className="mt-5 flex flex-wrap items-end justify-between gap-5 border-b border-line pb-8">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Order {orderNumber(order.id)}</h1>
          <p className="mt-3 text-sm text-stone">Placed {formatDate(order.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-4">
          <PaymentBadge payment={order.payment} />
          <OrderStatusBadge status={order.status} />
        </div>
      </header>

      {awaitingPayment && (
        <Alert
          severity="warning"
          className="mt-8"
          action={
            canResumePayment && (
              <button type="button" onClick={resumePayment} disabled={paying} className="whitespace-nowrap px-2 text-sm font-semibold underline">
                {paying ? <CircularProgress size={14} color="inherit" /> : 'Complete payment'}
              </button>
            )
          }
        >
          {canResumePayment
            ? 'This order is waiting for payment. Unpaid orders are released after 30 minutes.'
            : 'This order is waiting for a payment we can no longer take online. Cancel it below and order again, or contact us for help.'}
          {payError && <span className="mt-1 block">{payError}</span>}
        </Alert>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
        <div className="space-y-6">
          <section className="bg-surface p-6 ring-1 ring-line sm:p-8" aria-labelledby="progress-title">
            <h2 id="progress-title" className="sr-only">Progress</h2>
            <OrderTimeline order={order} />

            {order.status !== 'cancelled' && (order.trackingNumber || order.estimatedDelivery) && (
              <div className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6 text-sm">
                {order.estimatedDelivery && order.status !== 'delivered' && (
                  <div>
                    <p className={label}>Estimated delivery</p>
                    <p className="mt-1 font-medium">{formatDate(order.estimatedDelivery, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                )}
                {order.trackingNumber && (
                  <div>
                    <p className={label}>Tracking</p>
                    <p className="mt-1 flex items-center gap-2 font-medium">
                      <LocalShippingOutlinedIcon sx={{ fontSize: 18 }} className="text-gold" />
                      {order.carrier && <span>{order.carrier}</span>}
                      <span className="font-mono">{order.trackingNumber}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="bg-surface p-6 ring-1 ring-line sm:p-8" aria-labelledby="items-title">
            <h2 id="items-title" className="font-display text-2xl">Items</h2>
            <div className="mt-6"><OrderItemList items={order.items} /></div>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <section className="bg-surface p-6 ring-1 ring-line sm:p-8" aria-labelledby="summary-title">
            <h2 id="summary-title" className="font-display text-2xl">Summary</h2>
            <div className="mt-6"><OrderTotals order={order} /></div>
            <p className="mt-4 text-xs text-stone">
              {order.payment?.method === 'card'
                ? `Paid online through ${order.payment.provider === 'razorpay' ? 'Razorpay' : 'Stripe'}.`
                : `Pay ${money(order.totalAmount)} on delivery.`}
            </p>
          </section>

          <section className="bg-surface p-6 text-sm leading-relaxed ring-1 ring-line sm:p-8" aria-labelledby="ship-title">
            <h2 id="ship-title" className={label}>Delivering to</h2>
            <p className="mt-3 font-medium">{address.fullName}</p>
            <p className="text-stone">
              {address.address}
              <br />
              {address.city}, {address.state} {address.zipCode}
              <br />
              {address.country}
            </p>
            {address.phone && <p className="mt-2 text-stone">{address.phone}</p>}
          </section>

          <section className="space-y-3 px-1 text-sm">
            {order.status === 'pending' && (
              <button type="button" onClick={() => setConfirming(true)} disabled={cancelling} className="btn-outline w-full">
                {cancelling ? <CircularProgress size={16} color="inherit" /> : 'Cancel order'}
              </button>
            )}
            {order.status === 'delivered' && (
              <p className="text-stone">
                Not quite right? Returns are free within 30 days. <Link to="/returns" className="underline">How returns work</Link>
              </p>
            )}
            <Link to={`/contact?order=${orderNumber(order.id)}`} className="btn-outline w-full">Get help with this order</Link>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        title={`Cancel order ${orderNumber(order.id)}?`}
        description={
          order.payment?.status === 'paid'
            ? `You will be refunded ${money(order.totalAmount)} to your original payment method, usually within 5–10 business days.`
            : 'Your items will be released and no payment will be taken.'
        }
        confirmLabel="Cancel order"
        onConfirm={cancel}
        onClose={() => setConfirming(false)}
      />
    </div>
  )
}

// Keyed by id, so moving between orders starts with fresh state.
function OrderPageRoute() {
  const { id } = useParams()
  return <OrderPage key={id} id={id} />
}

export default OrderPageRoute
