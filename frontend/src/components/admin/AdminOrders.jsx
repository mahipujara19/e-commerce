import { Fragment, useMemo, useState } from 'react'
import { CircularProgress, IconButton, MenuItem, TextField } from '@mui/material'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import { useDispatch, useSelector } from 'react-redux'
import useQueryParams from '../../hooks/useQueryParams'
import { fetchAllOrders, updateOrderStatus } from '../../toolkit/orderSlice'
import { fetchproduct } from '../../toolkit/productSlice'
import { downloadCsv } from '../../utils/csv'
import { formatDate, money, ORDER_STATUSES, orderNumber, PAYMENT_LABELS } from '../../utils/format'
import ConfirmDialog from '../ConfirmDialog'
import { OrderItemList, OrderTotals, PaymentBadge } from '../OrderDetails'
import { AdminEmpty, AdminPageHeader, DataTable, FilterChips, LoadError, SearchField, TableHead, TableSkeleton, Toolbar } from './AdminUI'

const COLUMNS = [
  { label: 'Order' },
  { label: 'Customer' },
  { label: 'Items' },
  { label: 'Total', align: 'right' },
  { label: 'Payment' },
  { label: 'Status' },
  { label: 'Details', hidden: true },
]

const label = 'text-[10px] font-semibold uppercase tracking-[0.18em] text-stone'

const customerName = (order) => order.user?.name ?? order.shippingAddress.fullName
const customerEmail = (order) => order.user?.email ?? order.shippingAddress.email

function StatusSelect({ order, updating, onChange }) {
  const cancelled = order.status === 'cancelled'
  // Unpaid online orders can only be cancelled until Stripe or Razorpay confirms the payment.
  const awaitingPayment = order.payment?.status === 'awaiting_payment'
  return (
    <div className="flex items-center gap-2">
      <TextField
        select
        size="small"
        value={order.status}
        onChange={(event) => onChange(order, event.target.value)}
        disabled={cancelled || updating}
        slotProps={{ htmlInput: { 'aria-label': `Status of ${orderNumber(order.id)}` } }}
        title={cancelled ? 'Cancelled orders are final' : undefined}
        sx={{ minWidth: 136, '& .MuiOutlinedInput-input': { py: '8px', fontSize: 13, textTransform: 'capitalize' } }}
      >
        {ORDER_STATUSES.map((status) => (
          <MenuItem
            key={status}
            value={status}
            disabled={awaitingPayment && status !== 'cancelled' && status !== 'pending'}
            sx={{ textTransform: 'capitalize', fontSize: 14 }}
          >
            {status}
          </MenuItem>
        ))}
      </TextField>
      {updating && <CircularProgress size={14} sx={{ color: 'rgb(var(--gold))' }} />}
    </div>
  )
}

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '')

// Carrier, tracking number and delivery estimate. The customer sees them on their order page and in the
// "shipped" email, so add them before marking the order as shipped.
function ShippingEditor({ order }) {
  const dispatch = useDispatch()
  const [values, setValues] = useState({
    carrier: order.carrier ?? '',
    trackingNumber: order.trackingNumber ?? '',
    estimatedDelivery: toDateInput(order.estimatedDelivery),
  })
  const [saving, setSaving] = useState(false)
  const dirty =
    values.carrier !== (order.carrier ?? '') ||
    values.trackingNumber !== (order.trackingNumber ?? '') ||
    values.estimatedDelivery !== toDateInput(order.estimatedDelivery)
  const locked = order.status === 'cancelled'

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      await dispatch(updateOrderStatus({ id: order.id, ...values, estimatedDelivery: values.estimatedDelivery || null })).unwrap()
    } catch {
      // Reported by the toast listener
    } finally {
      setSaving(false)
    }
  }

  const change = (field) => (event) => setValues((current) => ({ ...current, [field]: event.target.value }))

  return (
    <form onSubmit={save} className="space-y-3">
      <TextField size="small" label="Carrier" value={values.carrier} onChange={change('carrier')} disabled={locked} slotProps={{ htmlInput: { maxLength: 60 } }} />
      <TextField size="small" label="Tracking number" value={values.trackingNumber} onChange={change('trackingNumber')} disabled={locked} slotProps={{ htmlInput: { maxLength: 80 } }} />
      <TextField
        size="small"
        type="date"
        label="Estimated delivery"
        value={values.estimatedDelivery}
        onChange={change('estimatedDelivery')}
        disabled={locked}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      {!locked && (
        <button type="submit" disabled={!dirty || saving} className="btn-outline w-full !py-2.5">
          {saving ? <CircularProgress size={14} color="inherit" /> : 'Save shipping details'}
        </button>
      )}
    </form>
  )
}

function OrderDetailRow({ order }) {
  const address = order.shippingAddress
  return (
    <tr className="bg-ivory/60">
      <td colSpan={COLUMNS.length} className="px-5 py-6">
        {/* The table scrolls sideways on small screens; the details stay pinned to the visible width. */}
        <div className="sticky left-5 grid w-[calc(100vw-5.5rem)] max-w-full animate-fade-in gap-8 sm:w-[calc(100vw-7rem)] lg:w-auto lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <p className={label}>Items</p>
            <div className="mt-4"><OrderItemList items={order.items} linked={false} /></div>
          </div>
          <div className="text-sm leading-relaxed">
            <p className={label}>Customer</p>
            <p className="mt-3 font-medium">{customerName(order)}</p>
            <p className="break-all text-stone">{customerEmail(order)}</p>
            {order.user?.phone && <p className="text-stone">{order.user.phone}</p>}
            {!order.user && <p className="mt-1 text-xs text-stone">Account no longer exists</p>}
            <p className={`${label} mt-6`}>Ship to</p>
            <p className="mt-3">{address.fullName}</p>
            <p className="text-stone">
              {address.address}
              <br />
              {address.city}, {address.state} {address.zipCode}
              <br />
              {address.country}
            </p>
            {address.phone && <p className="text-stone">{address.phone}</p>}
          </div>
          <div>
            <p className={label}>Shipping</p>
            <div className="mt-4"><ShippingEditor key={order.updatedAt} order={order} /></div>
          </div>
          <div>
            <p className={label}>Summary</p>
            <div className="mt-4"><OrderTotals order={order} /></div>
            <p className="mt-4 text-xs text-stone">
              {order.payment?.method === 'card' ? `Online (${order.payment.provider === 'razorpay' ? 'Razorpay' : 'Stripe'})` : 'Pay on delivery'} ·{' '}
              {PAYMENT_LABELS[order.payment?.status] ?? 'Unpaid'}
            </p>
            {order.statusHistory?.length > 0 && (
              <ol className="mt-4 space-y-1.5 border-t border-line pt-4 text-xs text-stone">
                {order.statusHistory.map((event, index) => (
                  <li key={`${event.at}-${index}`}>
                    <span className="capitalize text-ink">{event.status}</span>
                    {event.note ? ` · ${event.note}` : ''} · {formatDate(event.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// Exports the orders currently shown (after filters and search), one row per order.
const exportOrders = (orders) => {
  const header = ['Order', 'Placed', 'Status', 'Payment', 'Customer', 'Email', 'Phone', 'Address', 'City', 'State', 'Postal code',
    'Country', 'Items', 'Subtotal', 'Discount', 'Coupon', 'Shipping', 'Tax', 'Total', 'Carrier', 'Tracking']
  const rows = orders.map((order) => {
    const a = order.shippingAddress
    return [
      orderNumber(order.id), new Date(order.createdAt).toISOString(), order.status, PAYMENT_LABELS[order.payment?.status] ?? '',
      customerName(order), customerEmail(order), a.phone ?? '', a.address, a.city, a.state, a.zipCode, a.country,
      order.items.map((item) => `${item.quantity} x ${item.name}`).join('; '),
      order.subtotal, order.discount ?? 0, order.couponCode ?? '', order.shipping, order.tax, order.totalAmount,
      order.carrier ?? '', order.trackingNumber ?? '',
    ]
  })
  downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
}

function AdminOrders() {
  const dispatch = useDispatch()
  const { items: orders, status, error } = useSelector((state) => state.orders.all)
  const [params, setParams] = useQueryParams()
  const [updatingId, setUpdatingId] = useState(null)
  const [cancelling, setCancelling] = useState(null)

  const activeStatus = ORDER_STATUSES.includes(params.get('status')) ? params.get('status') : ''
  const query = params.get('q') ?? ''
  const expandedId = params.get('order')

  const counts = useMemo(
    () => orders.reduce((totals, order) => ({ ...totals, [order.status]: (totals[order.status] ?? 0) + 1 }), {}),
    [orders],
  )

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return orders.filter((order) => {
      if (activeStatus && order.status !== activeStatus) return false
      if (!term) return true
      return [orderNumber(order.id), customerName(order), customerEmail(order)].join(' ').toLowerCase().includes(term)
    })
  }, [orders, activeStatus, query])

  const applyStatus = async (order, nextStatus) => {
    setUpdatingId(order.id)
    try {
      await dispatch(updateOrderStatus({ id: order.id, status: nextStatus })).unwrap()
      // Cancelling returns the items to stock, so the catalogue needs the new numbers.
      if (nextStatus === 'cancelled') dispatch(fetchproduct({ force: true }))
    } catch {
      // Reported by the toast listener
    } finally {
      setUpdatingId(null)
    }
  }

  const handleStatusChange = (order, nextStatus) => {
    if (nextStatus === order.status) return
    if (nextStatus === 'cancelled') setCancelling(order)
    else applyStatus(order, nextStatus)
  }

  const loading = orders.length === 0 && (status === 'idle' || status === 'loading')
  const filters = [{ id: '', label: 'All', count: orders.length }, ...ORDER_STATUSES.map((id) => ({ id, label: id, count: counts[id] ?? 0 }))]

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description={loading ? 'Loading…' : `${orders.length} orders · ${(counts.pending ?? 0) + (counts.processing ?? 0)} need attention`}
        actions={
          <button type="button" onClick={() => exportOrders(visible)} disabled={!visible.length} className="btn-outline !py-2.5">
            <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} /> Export CSV
          </button>
        }
      />

      <Toolbar>
        <FilterChips label="Filter by status" options={filters} value={activeStatus} onChange={(id) => setParams({ status: id, order: null })} />
        <SearchField label="Search orders" value={query} onChange={(value) => setParams({ q: value })} placeholder="Order number or customer" />
      </Toolbar>

      {status === 'failed' && <LoadError message={`Could not load orders: ${error}`} onRetry={() => dispatch(fetchAllOrders())} />}

      {loading ? (
        <TableSkeleton />
      ) : visible.length === 0 ? (
        status !== 'failed' && (
          <AdminEmpty
            icon={ReceiptLongOutlinedIcon}
            title={query ? 'No matching orders' : activeStatus ? `No ${activeStatus} orders` : 'No orders yet'}
            description={
              query || activeStatus ? 'Try a different filter or search.' : 'Orders will appear here as soon as customers check out.'
            }
            action={
              (query || activeStatus) && (
                <button type="button" onClick={() => setParams({ status: null, q: null })} className="btn-outline">Clear filters</button>
              )
            }
          />
        )
      ) : (
        <DataTable minWidth={860}>
          <TableHead columns={COLUMNS} dense />
          <tbody className="divide-y divide-line">
            {visible.map((order) => {
              const expanded = expandedId === order.id
              const pieces = order.items.reduce((total, item) => total + item.quantity, 0)
              return (
                <Fragment key={order.id}>
                  <tr className={`align-middle transition-colors ${expanded ? 'bg-ivory/60' : 'hover:bg-ivory/60'}`}>
                    <td className="px-4 py-4">
                      <p className="whitespace-nowrap font-mono text-sm font-semibold tracking-wider">{orderNumber(order.id)}</p>
                      <p className="text-xs text-stone">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium">{customerName(order)}</p>
                      <p className="max-w-[190px] truncate text-xs text-stone" title={customerEmail(order)}>{customerEmail(order)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center -space-x-2">
                        {order.items.slice(0, 3).map((item) => (
                          <span key={item.product} className="h-9 w-9 overflow-hidden rounded-full bg-sand p-1 ring-2 ring-surface">
                            <img src={item.image} alt="" className="h-full w-full object-contain" />
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 whitespace-nowrap text-xs text-stone">{pieces} {pieces === 1 ? 'piece' : 'pieces'}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-semibold tabular-nums">{money(order.totalAmount)}</td>
                    <td className="px-4 py-4"><PaymentBadge payment={order.payment} /></td>
                    <td className="px-4 py-4">
                      <StatusSelect order={order} updating={updatingId === order.id} onChange={handleStatusChange} />
                    </td>
                    <td className="px-3 py-4 text-right">
                      <IconButton
                        onClick={() => setParams({ order: expanded ? null : order.id })}
                        aria-expanded={expanded}
                        aria-label={`${expanded ? 'Hide' : 'Show'} details for ${orderNumber(order.id)}`}
                      >
                        <ExpandMoreRoundedIcon className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </IconButton>
                    </td>
                  </tr>
                  {expanded && <OrderDetailRow order={order} />}
                </Fragment>
              )
            })}
          </tbody>
        </DataTable>
      )}

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={cancelling ? `Cancel order ${orderNumber(cancelling.id)}?` : ''}
        description={`The items go back into stock and the order can no longer be changed.${cancelling ? ` Order total ${money(cancelling.totalAmount)}.` : ''}`}
        confirmLabel="Cancel order"
        onConfirm={() => {
          applyStatus(cancelling, 'cancelled')
          setCancelling(null)
        }}
        onClose={() => setCancelling(null)}
      />
    </>
  )
}

export default AdminOrders
