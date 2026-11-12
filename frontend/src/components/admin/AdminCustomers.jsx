import { useMemo } from 'react'
import { Drawer, IconButton } from '@mui/material'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import useQueryParams from '../../hooks/useQueryParams'
import { fetchCustomers } from '../../toolkit/customerSlice'
import { formatDate, money, orderNumber } from '../../utils/format'
import { orderLink } from './adminSections'
import { OrderStatusBadge } from '../OrderDetails'
import { AdminEmpty, AdminPageHeader, DataTable, FilterChips, LoadError, SearchField, TableHead, TableSkeleton, Toolbar } from './AdminUI'

// Shoppers only: admins and staff are managed under Team.
const FILTERS = [
  { id: '', label: 'All customers', test: () => true },
  { id: 'repeat', label: 'Repeat buyers', test: (user) => user.orderCount > 1 },
  { id: 'unverified', label: 'Unverified', test: (user) => !user.emailVerified },
]

const COLUMNS = [
  { label: 'Customer' },
  { label: 'Email status' },
  { label: 'Orders', align: 'right' },
  { label: 'Total spent', align: 'right' },
  { label: 'Last order' },
  { label: 'Joined' },
]

const initials = (name) => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()

function Avatar({ name, size = 'h-10 w-10 text-[12px]' }) {
  return <span className={`grid shrink-0 place-items-center rounded-full bg-sand font-semibold ${size}`}>{initials(name)}</span>
}

function VerifiedLabel({ verified }) {
  return verified ? (
    <span className="inline-flex items-center gap-1.5 text-xs"><CheckCircleRoundedIcon sx={{ fontSize: 15 }} className="text-gold" /> Verified</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs text-stone"><MarkEmailUnreadOutlinedIcon sx={{ fontSize: 15 }} /> Unverified</span>
  )
}

// Order history comes from the orders already loaded for the admin area, so opening a profile is instant.
function CustomerPanel({ customer, onClose }) {
  const orders = useSelector((state) => state.orders.all.items)
  const history = useMemo(() => orders.filter((order) => order.user?.id === customer.id), [orders, customer.id])
  const activeOrders = history.filter((order) => order.status !== 'cancelled').length
  const average = activeOrders ? customer.totalSpent / activeOrders : 0

  const details = [
    ['Email', customer.email],
    ['Phone', customer.phone || '—'],
    ['Joined', formatDate(customer.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })],
  ]

  return (
    <div className="flex h-full flex-col bg-ivory">
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-6">
        <div className="flex items-center gap-4">
          <Avatar name={customer.name} size="h-14 w-14 text-base" />
          <div className="min-w-0">
            <h2 className="font-display text-2xl leading-tight">{customer.name}</h2>
            <div className="mt-1"><VerifiedLabel verified={customer.emailVerified} /></div>
          </div>
        </div>
        <IconButton onClick={onClose} aria-label="Close customer details" edge="end">
          <CloseRoundedIcon />
        </IconButton>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-7">
        <dl className="grid grid-cols-3 gap-px bg-line ring-1 ring-line">
          {[
            ['Orders', customer.orderCount],
            ['Spent', money(customer.totalSpent)],
            ['Average', money(average)],
          ].map(([term, value]) => (
            <div key={term} className="bg-surface p-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone">{term}</dt>
              <dd className="mt-2 font-display text-xl tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
          {details.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="text-stone">{term}</dt>
              <dd className="break-all">{value}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">Order history</h3>
          {history.length === 0 ? (
            <p className="mt-4 bg-surface px-5 py-8 text-center text-sm text-stone ring-1 ring-line">No orders placed yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line bg-surface ring-1 ring-line">
              {history.map((order) => (
                <li key={order.id}>
                  <Link to={orderLink(order)} onClick={onClose} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ivory/60">
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-sm font-semibold tracking-wider">{orderNumber(order.id)}</span>
                      <span className="block text-xs text-stone">{formatDate(order.createdAt)}</span>
                    </span>
                    <OrderStatusBadge status={order.status} />
                    <span className="w-20 text-right text-sm font-semibold tabular-nums">{money(order.totalAmount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function AdminCustomers() {
  const dispatch = useDispatch()
  const { items: accounts, status, error } = useSelector((state) => state.customers)
  const customers = useMemo(() => accounts.filter((account) => account.role === 'customer'), [accounts])
  const [params, setParams] = useQueryParams()

  const filter = FILTERS.find((item) => item.id === (params.get('filter') ?? '')) ?? FILTERS[0]
  const query = params.get('q') ?? ''
  const selected = customers.find((customer) => customer.id === params.get('customer'))

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return customers.filter(filter.test).filter((customer) => !term || `${customer.name} ${customer.email}`.toLowerCase().includes(term))
  }, [customers, filter, query])

  const loading = accounts.length === 0 && (status === 'idle' || status === 'loading')

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description={loading ? 'Loading…' : `${customers.length} customer ${customers.length === 1 ? 'account' : 'accounts'}`}
      />

      <Toolbar>
        <FilterChips
          label="Filter customers"
          options={FILTERS.map((item) => ({ id: item.id, label: item.label, count: customers.filter(item.test).length }))}
          value={filter.id}
          onChange={(id) => setParams({ filter: id })}
        />
        <SearchField label="Search customers" value={query} onChange={(value) => setParams({ q: value })} placeholder="Name or email" />
      </Toolbar>

      {status === 'failed' && <LoadError message={`Could not load customers: ${error}`} onRetry={() => dispatch(fetchCustomers())} />}

      {loading ? (
        <TableSkeleton />
      ) : visible.length === 0 ? (
        status !== 'failed' && (
          <AdminEmpty
            icon={PeopleAltOutlinedIcon}
            title={query || filter.id ? 'No matching accounts' : 'No customers yet'}
            description={query || filter.id ? 'Try a different filter or search.' : 'Accounts appear here as soon as customers sign up.'}
            action={
              (query || filter.id) && (
                <button type="button" onClick={() => setParams({ filter: null, q: null })} className="btn-outline">Clear filters</button>
              )
            }
          />
        )
      ) : (
        <DataTable minWidth={880}>
          <TableHead columns={COLUMNS} />
          <tbody className="divide-y divide-line">
            {visible.map((customer) => (
              <tr key={customer.id} className="align-middle transition-colors hover:bg-ivory/60">
                <td className="px-5 py-3">
                  <button type="button" onClick={() => setParams({ customer: customer.id })} className="group flex items-center gap-3 text-left">
                    <Avatar name={customer.name} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-medium group-hover:text-gold">
                        {customer.name}

                      </span>
                      <span className="block max-w-[260px] truncate text-xs text-stone">{customer.email}</span>
                    </span>
                  </button>
                </td>
                <td className="px-5 py-3"><VerifiedLabel verified={customer.emailVerified} /></td>
                <td className="px-5 py-3 text-right tabular-nums">{customer.orderCount}</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums">{money(customer.totalSpent)}</td>
                <td className="px-5 py-3 text-xs text-stone">{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '—'}</td>
                <td className="px-5 py-3 text-xs text-stone">{formatDate(customer.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => setParams({ customer: null })}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 }, backgroundImage: 'none' } } }}
      >
        {selected && <CustomerPanel customer={selected} onClose={() => setParams({ customer: null })} />}
      </Drawer>
    </>
  )
}

export default AdminCustomers
