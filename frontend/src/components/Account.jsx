import { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, CircularProgress, TextField } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { Link, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { updateProfile } from '../toolkit/authSlice'
import { fetchMyOrders } from '../toolkit/orderSlice'
import { notify } from '../toolkit/toastSlice'
import { api } from '../utils/api'
import { formatDate, money, orderNumber } from '../utils/format'
import EmptyState from './EmptyState'
import { OrderCardSkeleton, OrderItemList, OrderStatusBadge, OrderTotals } from './OrderDetails'

const TABS = [
  { id: 'details', label: 'Your details' },
  { id: 'orders', label: 'Order history' },
]

const profileSchema = Yup.object({
  firstName: Yup.string().trim().min(2, 'First name must be at least 2 characters').max(50).required('First name is required'),
  lastName: Yup.string().trim().min(2, 'Last name must be at least 2 characters').max(50).required('Last name is required'),
  phone: Yup.string().matches(/^\+?[\d\s\-()]{7,15}$/, 'Please enter a valid phone number').optional(),
})

const RESEND_COOLDOWN_SECONDS = 60

const tabClass = (active) =>
  `relative py-3 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors hover:text-gold after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-current after:transition-transform ${
    active ? 'text-ink after:scale-x-100' : 'text-stone after:scale-x-0'
  }`

function VerificationCard({ user }) {
  const dispatch = useDispatch()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Mirrors the server's one-minute limit so the button explains itself instead of failing.
  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const resend = async () => {
    setSending(true)
    setError('')
    try {
      await api('/users/me/verification', { method: 'POST' })
      setSentTo(user.email)
      setCooldown(RESEND_COOLDOWN_SECONDS)
      dispatch(notify('A new verification link is on its way to your inbox'))
    } catch (requestError) {
      setError(requestError.message)
      if (requestError.status === 429) setCooldown(Number(requestError.message.match(/\d+/)?.[0]) || RESEND_COOLDOWN_SECONDS)
    } finally {
      setSending(false)
    }
  }

  if (user.emailVerified) {
    return (
      <p className="flex items-center gap-2 text-sm">
        <CheckCircleRoundedIcon sx={{ fontSize: 18 }} className="text-gold" /> Email verified
      </p>
    )
  }

  return (
    <div className="bg-sand p-5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <MarkEmailUnreadOutlinedIcon sx={{ fontSize: 18 }} className="text-gold" /> Please verify your email
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone">
        We sent a link to {user.email}. Verifying lets you write reviews and keeps your account secure.
      </p>
      {sentTo && !error && (
        <p className="mt-3 text-sm" role="status">New link sent to {sentTo}. It may take a minute to arrive; check your spam folder too.</p>
      )}
      {error && <Alert severity="error" className="mt-3">{error}</Alert>}
      <button type="button" onClick={resend} disabled={sending || cooldown > 0} className="btn-outline mt-4 w-full !py-3">
        {sending ? <CircularProgress size={16} color="inherit" /> : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend link'}
      </button>
    </div>
  )
}

function DetailsTab({ user }) {
  const dispatch = useDispatch()
  const wishlistCount = useSelector((state) => state.wishlist.ids.length)
  const bagCount = useSelector((state) => state.cart.items.reduce((total, item) => total + (item.quantity ?? 1), 0))

  const formik = useFormik({
    initialValues: { firstName: user.firstName, lastName: user.lastName, phone: user.phone ?? '' },
    validationSchema: profileSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        await dispatch(
          updateProfile({ name: `${values.firstName.trim()} ${values.lastName.trim()}`, phone: values.phone.trim() }),
        ).unwrap()
      } catch {
        // The toast listener reports the error
      }
    },
  })

  const fieldProps = (name) => {
    const invalid = formik.touched[name] && Boolean(formik.errors[name])
    return {
      id: `profile-${name}`,
      name,
      value: formik.values[name],
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: invalid,
      helperText: invalid ? formik.errors[name] : undefined,
    }
  }

  const links = [
    { to: '/wishlist', icon: FavoriteBorderRoundedIcon, label: 'Wishlist', meta: wishlistCount },
    { to: '/cart', icon: ShoppingBagOutlinedIcon, label: 'Your bag', meta: bagCount },
    { to: '/account?tab=orders', icon: ReceiptLongOutlinedIcon, label: 'Order history' },
  ]

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
      <form onSubmit={formik.handleSubmit} noValidate className="bg-surface p-6 ring-1 ring-line sm:p-8">
        <h2 className="font-display text-2xl">Personal details</h2>
        <div className="mt-7 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField {...fieldProps('firstName')} label="First name" autoComplete="given-name" />
            <TextField {...fieldProps('lastName')} label="Last name" autoComplete="family-name" />
          </div>
          <TextField
            id="profile-email"
            label="Email address"
            value={user.email}
            disabled
            helperText="Contact our concierge to change the email on your account."
          />
          <TextField {...fieldProps('phone')} label="Phone number (optional)" type="tel" autoComplete="tel" />
        </div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {formik.dirty && (
            <button type="button" onClick={() => formik.resetForm()} className="btn-outline">
              Discard changes
            </button>
          )}
          <button type="submit" disabled={!formik.dirty || formik.isSubmitting} className="btn-primary min-w-[180px]">
            {formik.isSubmitting ? <CircularProgress size={18} color="inherit" /> : 'Save changes'}
          </button>
        </div>
      </form>

      <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
        <div className="bg-surface p-6 ring-1 ring-line sm:p-8">
          <h2 className="font-display text-2xl">Account</h2>
          <div className="mt-6">
            <VerificationCard user={user} />
          </div>
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {links.map(({ to, icon: Icon, label, meta }) => (
              <li key={to}>
                <Link to={to} className="group flex items-center gap-3 py-4 text-sm transition-colors hover:text-gold">
                  <Icon sx={{ fontSize: 20 }} className="text-gold" />
                  <span className="flex-1 font-medium">{label}</span>
                  {meta > 0 && <span className="text-stone">{meta}</span>}
                  <ChevronRightRoundedIcon sx={{ fontSize: 18 }} className="text-stone transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

function OrderCard({ order }) {
  const [open, setOpen] = useState(false)
  const pieces = order.items.reduce((total, item) => total + item.quantity, 0)

  return (
    <article className="bg-surface p-6 ring-1 ring-line sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="font-mono text-sm font-semibold tracking-wider">{orderNumber(order.id)}</p>
          <p className="mt-1 text-sm text-stone">
            Placed {formatDate(order.createdAt)} · {pieces} {pieces === 1 ? 'piece' : 'pieces'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <OrderStatusBadge status={order.status} />
          <span className="font-display text-2xl">{money(order.totalAmount)}</span>
        </div>
      </header>

      <div className="mt-6">
        <OrderItemList items={order.items} />
      </div>

      {open && (
        <div className="mt-6 grid animate-fade-in gap-8 border-t border-line pt-6 sm:grid-cols-2">
          <div className="text-sm leading-relaxed">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">Shipping to</p>
            <p className="mt-2 font-medium">{order.shippingAddress.fullName}</p>
            <p className="text-stone">
              {order.shippingAddress.address}, {order.shippingAddress.city}
              <br />
              {order.shippingAddress.state} {order.shippingAddress.zipCode}, {order.shippingAddress.country}
            </p>
          </div>
          <OrderTotals order={order} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone underline-offset-4 hover:text-ink hover:underline"
      >
        {open ? 'Hide details' : 'View details'}
      </button>
    </article>
  )
}

function OrdersTab() {
  const dispatch = useDispatch()
  const { items: orders, status, error } = useSelector((state) => state.orders.mine)

  useEffect(() => {
    dispatch(fetchMyOrders())
  }, [dispatch])

  if (status === 'failed') {
    return (
      <Alert
        severity="error"
        className="mt-10"
        action={
          <button type="button" onClick={() => dispatch(fetchMyOrders())} className="px-3 text-sm font-semibold underline">
            Retry
          </button>
        }
      >
        We couldn&apos;t load your orders: {error}
      </Alert>
    )
  }

  // Cached orders stay visible while a refresh is in flight.
  if (orders.length === 0 && status !== 'succeeded') {
    return (
      <div className="mt-10 space-y-5" role="status" aria-label="Loading orders">
        <OrderCardSkeleton />
        <OrderCardSkeleton />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ReceiptLongOutlinedIcon}
        title="No orders yet"
        description="When you place an order, you'll be able to follow it here."
        action={<Link to="/shop" className="btn-primary">Discover the collection</Link>}
      />
    )
  }

  return (
    <div className="mt-10 space-y-5">
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  )
}

function Account() {
  const user = useSelector((state) => state.auth.user)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.some((item) => item.id === searchParams.get('tab')) ? searchParams.get('tab') : 'details'

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="border-b border-line">
        <div className="flex flex-wrap items-end justify-between gap-6 pb-8">
          <div className="flex items-center gap-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-ink font-display text-2xl text-ivory">
              {`${user.firstName[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()}
            </span>
            <div>
              <h1 className="font-display text-4xl md:text-5xl">Hello, {user.firstName}</h1>
              {user.createdAt && (
                <p className="mt-2 text-sm text-stone">Member since {formatDate(user.createdAt, { month: 'long', year: 'numeric' })}</p>
              )}
            </div>
          </div>
        </div>
        <nav className="-mb-px flex gap-8" aria-label="Account sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSearchParams(item.id === 'details' ? {} : { tab: item.id })}
              aria-current={tab === item.id ? 'page' : undefined}
              className={tabClass(tab === item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'orders' ? <OrdersTab /> : <DetailsTab user={user} />}
    </div>
  )
}

export default Account
