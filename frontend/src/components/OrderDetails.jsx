import { Link } from 'react-router-dom'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import { formatDate, money, PAYMENT_LABELS } from '../utils/format'

const STATUS_STYLES = {
  pending: 'bg-sand text-stone',
  processing: 'bg-gold-soft text-gold',
  shipped: 'bg-ink text-ivory',
  delivered: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
  cancelled: 'bg-red-600/10 text-red-700 dark:text-red-400',
}

export function OrderStatusBadge({ status }) {
  return (
    <span className={`inline-flex px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}>
      {status}
    </span>
  )
}

// Items are snapshots taken at checkout, so links may point at products that were since removed.
// The admin area passes linked={false} so it never sends staff into the storefront.
export function OrderItemList({ items, linked = true }) {
  const Thumb = linked ? Link : 'span'
  const Name = linked ? Link : 'span'

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.product} className="flex items-center gap-4">
          <Thumb {...(linked && { to: `/productitem/${item.product}` })} className="relative h-16 w-16 shrink-0 bg-sand p-1.5">
            <img src={item.image} alt="" className="h-full w-full object-contain" />
            <span className="absolute -right-2 -top-2 grid h-5 min-w-[20px] place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold text-ivory">
              {item.quantity}
            </span>
          </Thumb>
          <span className="min-w-0 flex-1">
            <Name
              {...(linked && { to: `/productitem/${item.product}` })}
              className={`line-clamp-2 font-display text-sm leading-snug ${linked ? 'hover:text-gold' : ''}`}
            >
              {item.name}
            </Name>
            <span className="mt-0.5 block text-xs text-stone">{money(item.price)} each</span>
          </span>
          <span className="text-sm font-semibold">{money(item.price * item.quantity)}</span>
        </li>
      ))}
    </ul>
  )
}

export function OrderTotals({ order }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
      {order.discount > 0 && (
        <div className="flex justify-between text-gold">
          <dt>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</dt>
          <dd>−{money(order.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between"><dt className="text-stone">Shipping</dt><dd>{order.shipping === 0 ? 'Free' : money(order.shipping)}</dd></div>
      <div className="flex justify-between"><dt className="text-stone">Tax</dt><dd>{money(order.tax)}</dd></div>
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <dt className="font-semibold uppercase tracking-[0.14em]">Total</dt>
        <dd className="font-display text-2xl">{money(order.totalAmount)}</dd>
      </div>
    </dl>
  )
}

const PAYMENT_STYLES = {
  paid: 'text-emerald-700 dark:text-emerald-400',
  refunded: 'text-stone',
  awaiting_payment: 'text-gold',
  unpaid: 'text-stone',
}

export function PaymentBadge({ payment }) {
  const status = payment?.status ?? 'unpaid'
  // An unpaid pay-on-delivery order is expected, not overdue, so it says so.
  const text = status === 'unpaid' && payment?.method !== 'card' ? 'Pay on delivery' : PAYMENT_LABELS[status] ?? status
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${PAYMENT_STYLES[status] ?? ''}`}>
      {text}
    </span>
  )
}

const PROGRESS = ['pending', 'processing', 'shipped', 'delivered']
const PROGRESS_LABELS = { pending: 'Order placed', processing: 'Being prepared', shipped: 'Shipped', delivered: 'Delivered' }

// Placed → prepared → shipped → delivered, with the date each step happened (from statusHistory).
export function OrderTimeline({ order }) {
  if (order.status === 'cancelled') {
    const at = order.statusHistory?.findLast?.((event) => event.status === 'cancelled')?.at ?? order.updatedAt
    return (
      <p className="bg-red-600/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
        Cancelled on {formatDate(at)}.{' '}
        {order.payment?.status === 'refunded' ? 'A refund was issued to your original payment method.' : 'No payment was taken.'}
      </p>
    )
  }

  const reached = PROGRESS.indexOf(order.status)
  const dateFor = (status) => (status === 'pending' ? order.createdAt : order.statusHistory?.findLast?.((event) => event.status === status)?.at)

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {PROGRESS.map((status, index) => {
        const done = index <= reached
        const date = done && dateFor(status)
        return (
          <li key={status} className="relative text-center" aria-current={index === reached ? 'step' : undefined}>
            {index > 0 && <span className={`absolute right-1/2 top-3.5 h-px w-full ${index <= reached ? 'bg-gold' : 'bg-line'}`} aria-hidden="true" />}
            <span className={`relative mx-auto grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${done ? 'bg-gold text-white' : 'bg-surface text-stone ring-1 ring-line'}`}>
              {done ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : index + 1}
            </span>
            <span className={`mt-2 block text-[11px] font-semibold uppercase tracking-[0.12em] ${done ? 'text-ink' : 'text-stone'}`}>{PROGRESS_LABELS[status]}</span>
            {date && <span className="block text-[11px] text-stone">{formatDate(date, { day: 'numeric', month: 'short' })}</span>}
          </li>
        )
      })}
    </ol>
  )
}

export function OrderCardSkeleton() {
  return (
    <div className="animate-pulse bg-surface p-6 ring-1 ring-line sm:p-8" aria-hidden="true">
      <div className="flex justify-between">
        <div className="h-5 w-32 bg-sand" />
        <div className="h-5 w-20 bg-sand" />
      </div>
      <div className="mt-6 flex gap-3">
        <div className="h-16 w-16 bg-sand" />
        <div className="h-16 w-16 bg-sand" />
      </div>
      <div className="mt-6 h-4 w-1/3 bg-sand" />
    </div>
  )
}
