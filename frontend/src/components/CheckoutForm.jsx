import { useCallback, useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, Checkbox, CircularProgress, FormControlLabel, MenuItem, TextField } from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import useLocationAddress from '../hooks/useLocationAddress'
import useMoney from '../hooks/useMoney'
import useOrderQuote from '../hooks/useOrderQuote'
import usePageMeta from '../hooks/usePageMeta'
import { fetchAddresses } from '../toolkit/addressSlice'
import { fetchproduct } from '../toolkit/productSlice'
import { changeQuantity, clearItem, isPurchasable, removeItem } from '../toolkit/slice'
import { notify } from '../toolkit/toastSlice'
import { gaItem, trackEvent } from '../utils/analytics'
import { api } from '../utils/api'
import { cartTotals, CURRENCY, money } from '../utils/format'
import { COUNTRIES } from '../utils/countries'
import { customerPaymentMethods, isOnlinePayment } from '../utils/payments'
import useCouponOffers from '../hooks/useCouponOffers'
import CouponOffers from './CouponOffers'

const phonePattern = /^\+?[\d\s\-()]{7,20}$/

const contactSchema = Yup.object({
  email: Yup.string().trim().email('Please enter a valid email').required('Email is required'),
  phone: Yup.string().trim().matches(phonePattern, 'Please enter a valid phone number, including the area code').required('Phone number is required so the courier can reach you'),
  acceptTerms: Yup.boolean().oneOf([true], 'Please accept the terms to place your order'),
})

// Only checked when typing a new address; saved addresses were validated when they were saved.
const addressSchema = Yup.object({
  fullName: Yup.string().trim().min(2, 'Name must be at least 2 characters').required('Full name is required'),
  address: Yup.string().trim().min(5, 'Please enter your full street address').required('Street address is required'),
  city: Yup.string().trim().min(2, 'City name is too short').required('City is required'),
  state: Yup.string().trim().required('State / Province is required'),
  zipCode: Yup.string().trim().matches(/^[A-Za-z0-9\s-]{3,10}$/, 'Please enter a valid postal code').required('Postal code is required'),
  country: Yup.string().required('Country is required'),
})

const ADDRESS_FIELDS = ['fullName', 'address', 'city', 'state', 'zipCode', 'country']

const STEPS = ['Bag', 'Details', 'Payment', 'Confirmation']

const PAYMENT_ICONS = { cod: PaymentsOutlinedIcon, stripe: CreditCardRoundedIcon }

export function CheckoutSteps({ current }) {
  return (
    <ol className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.18em]" aria-label="Checkout progress">
      {STEPS.map((step, index) => (
        <li key={step} className="flex items-center gap-3" aria-current={index === current ? 'step' : undefined}>
          <span
            className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${
              index < current ? 'bg-gold text-white' : index === current ? 'bg-ink text-ivory' : 'border border-line text-stone'
            }`}
          >
            {index < current ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : index + 1}
          </span>
          {index === 0 && current > 0 && current < 3 ? (
            <Link to="/cart" className="text-stone hover:text-ink">{step}</Link>
          ) : (
            <span className={index === current ? 'font-semibold text-ink' : 'text-stone'}>{step}</span>
          )}
          {index < STEPS.length - 1 && <span className="h-px w-5 bg-line sm:w-10" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  )
}

function CheckoutSection({ step, title, action, children }) {
  return (
    <section className="bg-surface p-6 ring-1 ring-line sm:p-8" aria-labelledby={`checkout-step-${step}`}>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <h2 id={`checkout-step-${step}`} className="flex items-center gap-4 font-display text-2xl">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink font-body text-sm font-semibold text-ivory">{step}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}

// Lists bag lines the server says cannot be bought as requested, with a one-click fix.
function StockIssues({ issues, items, onFix }) {
  const name = (productId) => items.find((item) => item.id === productId)?.title ?? 'An item'
  return (
    <Alert
      severity="warning"
      action={<button type="button" onClick={onFix} className="whitespace-nowrap px-2 text-sm font-semibold underline">Update my bag</button>}
    >
      <p className="font-semibold">Some items changed since you added them</p>
      <ul className="mt-1 list-disc pl-5">
        {issues.map((issue) => (
          <li key={issue.product}>
            {issue.type === 'unavailable' ? `${name(issue.product)} is no longer available` : issue.available === 0 ? `${name(issue.product)} is sold out` : `Only ${issue.available} of ${name(issue.product)} left`}
          </li>
        ))}
      </ul>
    </Alert>
  )
}

function CouponField({ applied, error, loading, onApply, onRemove }) {
  const [code, setCode] = useState('')

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 bg-gold-soft px-4 py-3 text-sm">
        <span>
          Code <strong className="font-mono">{applied.code}</strong> applied
          {applied.description ? ` · ${applied.description}` : ''}
        </span>
        <button type="button" onClick={onRemove} className="text-xs font-semibold uppercase tracking-[0.14em] underline">Remove</button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (code.trim()) onApply(code.trim().toUpperCase())
      }}
      className="flex gap-2"
      noValidate
    >
      <TextField
        id="coupon"
        label="Promo code"
        size="small"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        error={Boolean(error)}
        helperText={error || undefined}
        slotProps={{ htmlInput: { maxLength: 40, autoCapitalize: 'characters' } }}
      />
      <button type="submit" disabled={!code.trim() || loading} className="btn-outline h-[40px] shrink-0 !px-4 !py-0">
        {loading ? <CircularProgress size={14} color="inherit" /> : 'Apply'}
      </button>
    </form>
  )
}

function CheckoutForm() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const user = useSelector((state) => state.auth.user)
  const cartItems = useSelector((state) => state.cart.items)
  const { items: addresses, status: addressStatus } = useSelector((state) => state.addresses)

  // { methods: [{ id, label, description }] } the customer can choose from; null while loading, 'failed' on error.
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [chosenMethod, setChosenMethod] = useState(null)
  const [couponCode, setCouponCode] = useState('')
  const [orderError, setOrderError] = useState('')
  // null until the customer chooses: then the default saved address is used. '' means "a new address".
  const [chosenAddressId, setChosenAddressId] = useState(null)

  usePageMeta({ title: 'Checkout', noindex: true })

  const purchasable = cartItems.filter(isPurchasable)
  // Set below once the form exists; the quote uses it for live shipping rates and tax.
  const [quoteAddress, setQuoteAddress] = useState(null)
  const { quote, loading: quoteLoading, error: quoteError, refresh: refreshQuote } = useOrderQuote(purchasable, couponCode, quoteAddress)
  const offers = useCouponOffers()
  // Checkout always shows and charges the store currency; a chosen display currency is only an extra estimate.
  const display = useMoney()
  const local = cartTotals(purchasable)
  const totals = quote
    ? { subtotal: quote.subtotal, discount: quote.discount, shipping: quote.shipping, tax: quote.tax, total: quote.totalAmount }
    : local
  const issues = quote?.issues ?? []
  const hasUnavailable = purchasable.length !== cartItems.length

  const methods = paymentConfig && paymentConfig !== 'failed' ? paymentConfig.methods : []
  // The customer's choice, or the first method the store offers.
  const paymentMethod = methods.some((method) => method.id === chosenMethod) ? chosenMethod : methods[0]?.id
  const card = isOnlinePayment(paymentMethod)

  const addressesLoading = addressStatus === 'idle' || addressStatus === 'loading'
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0]
  const selectedAddress = addresses.find((address) => address.id === (chosenAddressId ?? defaultAddress?.id))
  const usingNewAddress = !selectedAddress

  useEffect(() => {
    let active = true
    api('/orders/config')
      .then((config) => active && setPaymentConfig({ methods: customerPaymentMethods(config.paymentMethods) }))
      .catch(() => active && setPaymentConfig('failed'))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) dispatch(fetchAddresses())
  }, [dispatch, isAuthenticated])

  useEffect(() => {
    if (cartItems.length) {
      trackEvent('begin_checkout', { currency: CURRENCY, value: local.total, items: cartItems.map((item) => gaItem(item, item.quantity ?? 1)) })
    }
    // Once per visit to checkout, not on every bag change.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const formik = useFormik({
    initialValues: {
      fullName: user ? `${user.firstName} ${user.lastName}`.trim() : '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      saveAddress: true,
      acceptTerms: false,
      company: '',
    },
    validationSchema: usingNewAddress ? contactSchema.concat(addressSchema) : contactSchema,
    onSubmit: async (values, { setSubmitting }) => {
      // Honeypot filled in: a bot. Pretend nothing happened.
      if (values.company) {
        setSubmitting(false)
        return
      }
      setOrderError('')

      const source = selectedAddress ?? values
      try {
        const { order, payment } = await api('/orders', {
          method: 'POST',
          body: {
            items: purchasable.map((item) => ({ product: item.id, quantity: item.quantity ?? 1 })),
            couponCode: quote?.coupon?.code || undefined,
            paymentMethod,
            saveAddress: usingNewAddress && values.saveAddress && addresses.length < 10,
            shippingAddress: {
              ...Object.fromEntries(ADDRESS_FIELDS.map((field) => [field, String(source[field] ?? '').trim()])),
              email: values.email.trim(),
              phone: values.phone.trim(),
            },
          },
        })

        // Online payments keep the bag until payment is confirmed, so a cancelled payment brings the customer back to it.
        if (payment?.provider === 'stripe') {
          window.location.assign(payment.url)
          return
        }

        dispatch(clearItem())
        dispatch(fetchproduct({ force: true }))
        navigate(`/checkout/complete?order=${order.id}`, { replace: true })
      } catch (error) {
        setOrderError(error.message)
        if (error.code === 'STOCK_CHANGED') {
          dispatch(fetchproduct({ force: true }))
          refreshQuote()
        }
        setSubmitting(false)
      }
    },
  })

  // The address the order would ship to, once it is complete enough to price: a saved one, or the typed one.
  const typed = formik.values
  const deliveryAddress = selectedAddress
    ? { address: selectedAddress.address, city: selectedAddress.city, state: selectedAddress.state, zipCode: selectedAddress.zipCode, country: selectedAddress.country }
    : typed.address.trim().length >= 5 && typed.city.trim() && typed.zipCode.trim().length >= 3 && typed.country
      ? { address: typed.address.trim(), city: typed.city.trim(), state: typed.state.trim(), zipCode: typed.zipCode.trim(), country: typed.country }
      : null
  const deliveryKey = deliveryAddress ? JSON.stringify(deliveryAddress) : ''
  if (deliveryKey !== (quoteAddress ? JSON.stringify(quoteAddress) : '')) setQuoteAddress(deliveryAddress)

  const { setValues } = formik
  const fillAddress = useCallback(
    (fields) => {
      setValues((current) => ({
        ...current,
        ...fields,
        country: COUNTRIES.find((country) => country.toLowerCase() === (fields.country ?? '').toLowerCase()) ?? fields.country ?? current.country,
      }))
    },
    [setValues],
  )
  const location = useLocationAddress(fillAddress)

  const chooseAddress = (id) => {
    setChosenAddressId(id)
    if (!id) fillAddress({ address: '', city: '', state: '', zipCode: '' })
  }

  const fixBag = () => {
    issues.forEach((issue) => {
      const item = cartItems.find((cartItem) => cartItem.id === issue.product)
      if (!item) return
      if (issue.available === 0) dispatch(removeItem(item))
      else dispatch(changeQuantity({ id: item.id, change: issue.available - (item.quantity ?? 1) }))
    })
    dispatch(fetchproduct({ force: true }))
    dispatch(notify({ message: 'Your bag has been updated to what is in stock', severity: 'info' }))
  }

  const fieldProps = (name) => {
    const invalid = formik.touched[name] && Boolean(formik.errors[name])
    return {
      id: name,
      name,
      value: formik.values[name],
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: invalid,
      helperText: invalid ? formik.errors[name] : undefined,
    }
  }

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: '/checkout' }} replace />

  if (cartItems.length === 0) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-4xl">Your bag is empty</h1>
        <p className="mt-4 text-stone">Add a piece or two before checking out.</p>
        <Link to="/shop" className="btn-primary mt-10">Browse the collection</Link>
      </div>
    )
  }

  const blocked = issues.length > 0 || purchasable.length === 0 || quoteLoading || !quote || Boolean(quoteError)

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-4xl md:text-5xl">Checkout</h1>
          <p className="mt-3 text-sm text-stone">
            Signed in as <strong className="text-ink">{user?.firstName} {user?.lastName}</strong> ({user?.email})
          </p>
        </div>
        <CheckoutSteps current={1} />
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
        <form onSubmit={formik.handleSubmit} noValidate className="relative space-y-6" aria-describedby={orderError ? 'order-error' : undefined}>
          <CheckoutSection step={1} title="Contact">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField {...fieldProps('email')} label="Email for order updates" type="email" autoComplete="email" />
              <TextField {...fieldProps('phone')} label="Phone (for the courier)" type="tel" autoComplete="tel" />
            </div>
          </CheckoutSection>

          <CheckoutSection
            step={2}
            title="Delivery address"
            action={
              usingNewAddress && !addressesLoading && (
                <button
                  type="button"
                  onClick={location.detect}
                  disabled={location.loading}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-semibold transition hover:border-ink disabled:opacity-50"
                >
                  {location.loading ? <CircularProgress size={14} color="inherit" /> : <MyLocationRoundedIcon sx={{ fontSize: 16 }} />}
                  {location.loading ? 'Finding you…' : 'Use my location'}
                </button>
              )
            }
          >
            {addresses.length > 0 && (
              <fieldset>
                <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">Saved addresses</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {addresses.map((saved) => (
                    <label
                      key={saved.id}
                      className={`flex cursor-pointer gap-3 p-4 text-sm ring-1 transition ${selectedAddress?.id === saved.id ? 'bg-sand ring-ink' : 'ring-line hover:ring-stone'}`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddress?.id === saved.id}
                        onChange={() => chooseAddress(saved.id)}
                        className="mt-1 accent-current"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold">{saved.label || saved.fullName}{saved.isDefault && <span className="ml-2 text-xs font-normal text-stone">Default</span>}</span>
                        <span className="block truncate text-stone">{saved.address}, {saved.city}</span>
                        <span className="block text-stone">{saved.zipCode}, {saved.country}</span>
                      </span>
                    </label>
                  ))}
                  <label className={`flex cursor-pointer items-center gap-3 p-4 text-sm ring-1 transition ${usingNewAddress ? 'bg-sand ring-ink' : 'ring-line hover:ring-stone'}`}>
                    <input type="radio" name="savedAddress" checked={usingNewAddress} onChange={() => chooseAddress('')} className="accent-current" />
                    <span className="font-semibold">Use a new address</span>
                  </label>
                </div>
              </fieldset>
            )}

            {/* {location.error && <Alert severity="warning">{location.error}</Alert>} */}

            {addressesLoading && <div className="h-24 animate-pulse bg-sand" aria-hidden="true" />}

            <div className={usingNewAddress && !addressesLoading ? 'space-y-5' : 'hidden'}>
              <TextField {...fieldProps('fullName')} label="Full name" autoComplete="name" />
              <TextField {...fieldProps('address')} label="Street address and number" autoComplete="street-address" />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField {...fieldProps('city')} label="City" autoComplete="address-level2" />
                <TextField {...fieldProps('state')} label="State / Province" autoComplete="address-level1" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField {...fieldProps('zipCode')} label="Postal code" autoComplete="postal-code" />
                <TextField {...fieldProps('country')} label="Country" select autoComplete="country-name">
                  {COUNTRIES.map((country) => (
                    <MenuItem key={country} value={country}>{country}</MenuItem>
                  ))}
                </TextField>
              </div>
              {addresses.length < 10 && (
                <FormControlLabel
                  control={<Checkbox name="saveAddress" checked={formik.values.saveAddress} onChange={formik.handleChange} size="small" />}
                  label={<span className="text-sm">Save this address for next time</span>}
                />
              )}
            </div>
          </CheckoutSection>

          <CheckoutSection step={3} title="Payment">
            {paymentConfig === null ? (
              <div className="h-24 animate-pulse bg-sand" />
            ) : paymentConfig === 'failed' ? (
              <Alert severity="warning">We could not load the payment options. Please refresh the page.</Alert>
            ) : methods.length === 0 ? (
              <Alert severity="warning">
                Checkout is not available right now. Please <Link to="/contact" className="underline">contact us</Link> and we will help you place your order.
              </Alert>
            ) : (
              <fieldset>
                <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">Choose how to pay</legend>
                <div className="space-y-3">
                  {methods.map((method) => {
                    const Icon = PAYMENT_ICONS[method.id] ?? CreditCardRoundedIcon
                    const selected = method.id === paymentMethod
                    return (
                      <label
                        key={method.id}
                        className={`flex cursor-pointer items-start gap-4 p-4 ring-1 transition ${selected ? 'bg-sand ring-ink' : 'ring-line hover:ring-stone'}`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selected}
                          onChange={() => setChosenMethod(method.id)}
                          className="mt-1 h-4 w-4 shrink-0 accent-current"
                        />
                        <Icon className="mt-0.5 shrink-0 text-gold" />
                        <span className="min-w-0 text-sm">
                          <span className="block font-semibold">{method.label}</span>
                          <span className="mt-0.5 block leading-relaxed text-stone">{method.description}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-stone">
                  {card
                    ? "Your card details are entered on Stripe's secure page and never reach our servers."
                    : `Your order is reserved now and paid when it arrives. We will call ${formik.values.phone || 'your phone number'} if anything is needed.`}
                </p>
              </fieldset>
            )}

            <FormControlLabel
              control={<Checkbox name="acceptTerms" checked={formik.values.acceptTerms} onChange={formik.handleChange} size="small" />}
              label={
                <span className="text-sm">
                  I agree to the <Link to="/terms" target="_blank" className="underline">terms of sale</Link> and the{' '}
                  <Link to="/returns" target="_blank" className="underline">returns policy</Link>, and have read the{' '}
                  <Link to="/privacy" target="_blank" className="underline">privacy policy</Link>.
                </span>
              }
            />
            {formik.touched.acceptTerms && formik.errors.acceptTerms && (
              <p className="-mt-3 text-xs text-red-700 dark:text-red-400" role="alert">{formik.errors.acceptTerms}</p>
            )}
          </CheckoutSection>

          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
            <label htmlFor="company">Company</label>
            <input type="text" id="company" name="company" tabIndex={-1} autoComplete="off" value={formik.values.company} onChange={formik.handleChange} />
          </div>

          {orderError && <Alert severity="error" id="order-error" role="alert">{orderError}</Alert>}

          <button type="submit" disabled={formik.isSubmitting || blocked || !paymentMethod} className="btn-primary h-16 w-full text-[13px]">
            {formik.isSubmitting ? (
              <>
                <CircularProgress size={20} color="inherit" /> {card ? 'Opening secure payment…' : 'Placing your order…'}
              </>
            ) : (
              <>
                <LockOutlinedIcon sx={{ fontSize: 18 }} /> {card ? `Continue to payment · ${money(totals.total)}` : `Place order · ${money(totals.total)}`}
              </>
            )}
          </button>
          <p className="text-center text-xs text-stone">
            {card ? 'Your order is confirmed once payment succeeds. ' : ''}You can cancel free of charge until it is prepared for shipping.
          </p>
        </form>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start" aria-labelledby="checkout-summary-title">
          <div className="bg-surface p-7 ring-1 ring-line sm:p-8">
            <div className="flex items-baseline justify-between">
              <h2 id="checkout-summary-title" className="font-display text-2xl">Order summary</h2>
              <Link to="/cart" className="text-xs font-semibold uppercase tracking-[0.14em] text-stone underline-offset-4 hover:text-ink hover:underline">Edit bag</Link>
            </div>

            {(hasUnavailable || issues.length > 0) && (
              <div className="mt-5">
                {issues.length > 0 ? (
                  <StockIssues issues={issues} items={cartItems} onFix={fixBag} />
                ) : (
                  <Alert severity="info">Sold-out items in your bag are not included. <Link to="/cart" className="underline">Review your bag</Link></Alert>
                )}
              </div>
            )}

            <ul className="mt-6 space-y-5">
              {purchasable.map((item) => (
                <li key={item.id} className="flex items-center gap-4">
                  <span className="relative h-16 w-16 shrink-0 bg-sand p-1.5">
                    <img src={item.thumbnail} alt="" className="h-full w-full object-contain" />
                    <span className="absolute -right-2 -top-2 grid h-5 min-w-[20px] place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold text-ivory">
                      {item.quantity ?? 1}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 line-clamp-2 font-display text-sm leading-snug">{item.title}</span>
                  <span className="text-sm font-semibold">{money(item.price * (item.quantity ?? 1))}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 border-t border-line pt-6">
              <CouponField
                applied={quote?.coupon}
                error={couponCode && !quoteLoading ? quote?.couponError : ''}
                loading={quoteLoading && Boolean(couponCode)}
                onApply={setCouponCode}
                onRemove={() => setCouponCode('')}
              />
              <CouponOffers
                offers={offers}
                onApply={setCouponCode}
                appliedCode={quote?.coupon?.code}
                headingId="checkout-offers-title"
                title="Available offers"
                className="mt-5"
              />
            </div>

            <dl className="mt-6 space-y-3 text-sm" aria-busy={quoteLoading}>
              <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-gold"><dt>Discount</dt><dd>−{money(totals.discount)}</dd></div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-stone">
                  Shipping
                  {quote?.shippingMethod && totals.shipping > 0 && <span className="block text-xs">{quote.shippingMethod}</span>}
                </dt>
                <dd>{totals.shipping === 0 ? 'Free' : money(totals.shipping)}</dd>
              </div>
              <div className="flex justify-between"><dt className="text-stone">Tax</dt><dd>{money(totals.tax)}</dd></div>
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <dt className="font-semibold uppercase tracking-[0.14em]">Total</dt>
                <dd className="font-display text-3xl">{quoteLoading ? <CircularProgress size={20} color="inherit" /> : money(totals.total)}</dd>
              </div>
            </dl>
            {display.converted && !quoteLoading && (
              <p className="mt-3 text-xs leading-relaxed text-stone">
                About {display.format(totals.total)} in {display.currency}. You are charged {money(totals.total)} in {display.storeCurrency}; your
                bank sets the final exchange rate.
              </p>
            )}
            {quote?.pricing?.estimated && (
              <p className="mt-3 text-xs text-stone">Shipping and tax are estimates until your delivery address is complete.</p>
            )}
            {quote?.pricing?.fallback && (
              <p className="mt-3 text-xs text-stone">Live shipping or tax rates are unavailable right now, so our standard rates apply.</p>
            )}
            {quoteError && (
              <Alert severity="error" className="mt-4" action={<button type="button" onClick={refreshQuote} className="px-2 text-sm font-semibold underline">Retry</button>}>
                We could not confirm prices and stock: {quoteError}
              </Alert>
            )}
          </div>

          <ul className="space-y-3 px-1 text-xs text-stone">
            <li className="flex items-center gap-2">
              <LockOutlinedIcon sx={{ fontSize: 16 }} className="text-gold" />
              {card
                ? 'Encrypted connection and PCI-compliant payment by Stripe'
                : 'Encrypted connection; nothing to pay until delivery'}
            </li>
            <li className="flex items-center gap-2"><AutorenewRoundedIcon sx={{ fontSize: 16 }} className="text-gold" /> 30-day returns · <Link to="/returns" className="underline">policy</Link></li>
            <li className="flex items-center gap-2"><SupportAgentOutlinedIcon sx={{ fontSize: 16 }} className="text-gold" /> Questions? <Link to="/contact" className="underline">Contact us</Link></li>
          </ul>
        </aside>
      </div>
    </div>
  )
}

export default CheckoutForm
