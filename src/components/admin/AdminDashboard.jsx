import { useMemo, useState } from 'react'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAllOrders } from '../../toolkit/orderSlice'
import { formatDate, LOW_STOCK_THRESHOLD, money, ORDER_STATUSES, orderNumber } from '../../utils/format'
import { OrderStatusBadge } from '../OrderDetails'
import { AdminPageHeader, LoadError, Panel, PanelLink, StatCard, Thumb } from './AdminUI'
import { orderLink } from './adminSections'

const DAY_MS = 24 * 60 * 60 * 1000

const isLoading = (status, items) => items.length === 0 && (status === 'idle' || status === 'loading')

function ListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-11 animate-pulse bg-sand" />)}
    </div>
  )
}

function Quiet({ children }) {
  return <p className="py-8 text-center text-sm text-stone">{children}</p>
}

function AdminDashboard() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const { items: products, status: productStatus } = useSelector((state) => state.products)
  const { items: orders, status: orderStatus, error: orderError } = useSelector((state) => state.orders.all)
  const { items: customers, status: customerStatus } = useSelector((state) => state.customers)

  const ordersLoading = isLoading(orderStatus, orders)
  const productsLoading = isLoading(productStatus, products)
  const customersLoading = isLoading(customerStatus, customers)
  // Read once on mount so "last 30 days" figures stay stable across re-renders.
  const [now] = useState(() => Date.now())

  const stats = useMemo(() => {
    const active = orders.filter((order) => order.status !== 'cancelled')
    const shoppers = customers.filter((customer) => customer.role !== 'admin')
    const byStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]))
    orders.forEach((order) => {
      byStatus[order.status] += 1
    })

    return {
      revenue: active.reduce((total, order) => total + order.totalAmount, 0),
      revenue30: active
        .filter((order) => now - new Date(order.createdAt).getTime() <= 30 * DAY_MS)
        .reduce((total, order) => total + order.totalAmount, 0),
      openOrders: byStatus.pending + byStatus.processing,
      byStatus,
      shoppers,
      newShoppers: shoppers.filter((customer) => now - new Date(customer.createdAt).getTime() <= 30 * DAY_MS).length,
      outOfStock: products.filter((product) => product.stock === 0).length,
      lowStock: products.filter((product) => product.stock <= LOW_STOCK_THRESHOLD).sort((a, b) => a.stock - b.stock),
    }
  }, [orders, products, customers, now])

  const quickActions = [
    { to: '/admin/products?new=1', icon: AddRoundedIcon, label: 'Add a product', note: 'Create a new catalogue entry' },
    { to: '/admin/orders?status=pending', icon: PendingActionsOutlinedIcon, label: 'Process pending orders', note: `${stats.byStatus.pending} waiting` },
    { to: '/admin/inventory?stock=low', icon: Inventory2OutlinedIcon, label: 'Restock low items', note: `${stats.lowStock.length} at or below ${LOW_STOCK_THRESHOLD}` },
    { to: '/admin/customers', icon: ManageAccountsOutlinedIcon, label: 'Review customers', note: `${stats.newShoppers} joined this month` },
  ]

  return (
    <>
      <AdminPageHeader
        title={`Good to see you, ${user?.firstName}`}
        description={`Store overview · ${formatDate(now, { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

      {orderStatus === 'failed' && <LoadError message={`Could not load orders: ${orderError}`} onRetry={() => dispatch(fetchAllOrders())} />}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={PaymentsOutlinedIcon}
          label="Revenue"
          value={money(stats.revenue)}
          note={`${money(stats.revenue30)} in the last 30 days`}
          loading={ordersLoading}
        />
        <StatCard
          icon={ReceiptLongOutlinedIcon}
          label="Open orders"
          value={stats.openOrders}
          note={`${orders.length} orders in total`}
          loading={ordersLoading}
        />
        <StatCard
          icon={PeopleAltOutlinedIcon}
          label="Customers"
          value={stats.shoppers.length}
          note={`${stats.newShoppers} new in the last 30 days`}
          loading={customersLoading}
        />
        <StatCard
          icon={WarningAmberRoundedIcon}
          label="Inventory alerts"
          value={stats.lowStock.length}
          note={`${stats.outOfStock} out of stock`}
          loading={productsLoading}
          tone={stats.outOfStock > 0 ? 'alert' : undefined}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Quick actions">
          <ul className="-my-2 divide-y divide-line">
            {quickActions.map(({ to, icon: Icon, label, note }) => (
              <li key={to}>
                <Link to={to} className="group flex items-center gap-4 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand text-gold transition-colors group-hover:bg-ink group-hover:text-ivory">
                    <Icon sx={{ fontSize: 19 }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-stone">{note}</span>
                  </span>
                  <ChevronRightRoundedIcon sx={{ fontSize: 18 }} className="text-stone transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Order status" action={<PanelLink to="/admin/orders">Manage</PanelLink>}>
          {ordersLoading ? (
            <ListSkeleton />
          ) : orders.length === 0 ? (
            <Quiet>No orders yet.</Quiet>
          ) : (
            <ul className="space-y-4">
              {ORDER_STATUSES.map((status) => (
                <li key={status}>
                  <Link to={`/admin/orders?status=${status}`} className="group block">
                    <div className="flex items-center justify-between">
                      <OrderStatusBadge status={status} />
                      <span className="text-sm font-semibold tabular-nums group-hover:text-gold">{stats.byStatus[status]}</span>
                    </div>
                    <div className="mt-2 h-1 bg-sand">
                      <div
                        className="h-1 bg-ink transition-all duration-500"
                        style={{ width: `${(stats.byStatus[status] / orders.length) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Newest customers" action={<PanelLink to="/admin/customers">All</PanelLink>} className="lg:col-span-2 xl:col-span-1">
          {customersLoading ? (
            <ListSkeleton />
          ) : stats.shoppers.length === 0 ? (
            <Quiet>No customer accounts yet.</Quiet>
          ) : (
            <ul className="divide-y divide-line">
              {stats.shoppers.slice(0, 5).map((customer) => (
                <li key={customer.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand text-[11px] font-semibold">
                    {customer.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{customer.name}</span>
                    <span className="block truncate text-xs text-stone">Joined {formatDate(customer.createdAt)}</span>
                  </span>
                  <span className="text-xs text-stone">{customer.orderCount} {customer.orderCount === 1 ? 'order' : 'orders'}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Recent orders" action={<PanelLink to="/admin/orders">All orders</PanelLink>}>
          {ordersLoading ? (
            <ListSkeleton />
          ) : orders.length === 0 ? (
            <Quiet>Orders will appear here as soon as customers check out.</Quiet>
          ) : (
            <ul className="divide-y divide-line">
              {orders.slice(0, 6).map((order) => (
                <li key={order.id}>
                  <Link to={orderLink(order)} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 transition-colors hover:text-gold">
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-sm font-semibold tracking-wider">{orderNumber(order.id)}</span>
                      <span className="block truncate text-xs text-stone">
                        {order.user?.name ?? order.shippingAddress.fullName} · {formatDate(order.createdAt)}
                      </span>
                    </span>
                    <OrderStatusBadge status={order.status} />
                    <span className="w-24 text-right text-sm font-semibold tabular-nums">{money(order.totalAmount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Inventory alerts" action={<PanelLink to="/admin/inventory?stock=low">Inventory</PanelLink>}>
          {productsLoading ? (
            <ListSkeleton />
          ) : stats.lowStock.length === 0 ? (
            <Quiet>Every product is comfortably stocked.</Quiet>
          ) : (
            <ul className="divide-y divide-line">
              {stats.lowStock.slice(0, 6).map((product) => (
                <li key={product.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <Thumb src={product.thumbnail} size="h-10 w-10" />
                  <span className="line-clamp-1 min-w-0 flex-1 text-sm">{product.title}</span>
                  <span className={`text-xs font-semibold tabular-nums ${product.stock === 0 ? 'text-red-700 dark:text-red-400' : 'text-gold'}`}>
                    {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  )
}

export default AdminDashboard
