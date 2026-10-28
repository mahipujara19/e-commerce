import { useCallback, useRef, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, CircularProgress, MenuItem, TextField } from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded'
import { Link, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { clearItem } from '../toolkit/slice'
import { cartTotals, money } from '../utils/format'

const checkoutSchema = Yup.object({
  fullName: Yup.string().min(2, 'Name must be at least 2 characters').required('Full name is required'),
  email: Yup.string().email('Please enter a valid email').required('Email is required'),
  address: Yup.string().min(5, 'Please enter your full street address').required('Street address is required'),
  city: Yup.string().min(2, 'City name is too short').required('City is required'),
  state: Yup.string().required('State / Province is required'),
  zipCode: Yup.string().matches(/^[\d\w\s-]{3,10}$/, 'Please enter a valid postal code').required('Postal code is required'),
  country: Yup.string().required('Country is required'),
  cardName: Yup.string().min(2, 'Name on card is required').required('Name on card is required'),
  cardNumber: Yup.string().matches(/^[\d\s]{13,19}$/, 'Please enter a valid card number').required('Card number is required'),
  expiry: Yup.string().matches(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Please use MM/YY format').required('Expiry date is required'),
  cvv: Yup.string().matches(/^\d{3,4}$/, 'CVV must be 3 or 4 digits').required('CVV is required'),
})

const countries = [
  'United States', 'Canada', 'United Kingdom', 'Australia',
  'Germany', 'France', 'India', 'Japan', 'Brazil', 'Mexico',
]

const STEPS = ['Bag', 'Details', 'Confirmation']

function Steps({ current }) {
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
          {index === 0 && current > 0 && current < 2 ? (
            <Link to="/cart" className="text-stone hover:text-ink">{step}</Link>
          ) : (
            <span className={index === current ? 'font-semibold text-ink' : 'text-stone'}>{step}</span>
          )}
          {index < STEPS.length - 1 && <span className="h-px w-6 bg-line sm:w-14" aria-hidden="true" />}
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

function CardPreview({ name, number, expiry }) {
  const digits = number.replace(/\s/g, '')
  const masked = `${digits}${'•'.repeat(Math.max(16 - digits.length, 0))}`.replace(/(.{4})/g, '$1 ').trim()

  return (
    <div className="relative w-full max-w-sm overflow-hidden rounded-xl bg-gradient-to-br from-[#2e2721] via-night to-black p-6 text-cream shadow-2xl" aria-hidden="true">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-light/25 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <span className="font-display text-xl">good<em>things</em><span className="text-gold-light">.</span></span>
        <span className="text-[9px] uppercase tracking-[0.25em] text-cream/60">Private client</span>
      </div>
      <div className="relative mt-7 h-8 w-11 rounded-md bg-gradient-to-br from-gold-light to-gold" />
      <p className="relative mt-5 font-mono text-lg tracking-[0.16em] sm:text-xl">{masked}</p>
      <div className="relative mt-5 flex justify-between gap-4 text-[9px] uppercase tracking-[0.2em] text-cream/60">
        <div className="min-w-0">
          Card holder
          <p className="mt-1 truncate text-sm normal-case tracking-normal text-cream">{name || 'Your name'}</p>
        </div>
        <div className="text-right">
          Expires
          <p className="mt-1 text-sm tracking-normal text-cream">{expiry || 'MM/YY'}</p>
        </div>
      </div>
    </div>
  )
}

function CheckoutForm() {
  const dispatch = useDispatch()
  const [submitted, setSubmitted] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const user = useSelector((state) => state.auth.user)
  const cartItems = useSelector((state) => state.cart.items)

  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [coordinates, setCoordinates] = useState(null)
  const geolocationRequestId = useRef(0)

  const { subtotal, tax, shipping, total } = cartTotals(cartItems)

  const formik = useFormik({
    initialValues: {
      fullName: user ? `${user.firstName} ${user.lastName}` : '',
      email: user?.email || '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      cardName: '',
      cardNumber: '',
      expiry: '',
      cvv: '',
      company: '',
    },
    validationSchema: checkoutSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      if (values.company) {
        setSubmitted(true)
        setSubmitting(false)
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 2000))

      setOrderNumber(`GT-${Date.now().toString().slice(-6)}`)
      dispatch(clearItem())
      setSubmitted(true)
      setSubmitting(false)
    },
  })

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

  const handleCardNumberChange = (event) => {
    const raw = event.target.value.replace(/\D/g, '').slice(0, 16)
    formik.setFieldValue('cardNumber', raw.replace(/(\d{4})(?=\d)/g, '$1 '))
  }

  const handleExpiryChange = (event) => {
    const raw = event.target.value.replace(/\D/g, '').slice(0, 4)
    formik.setFieldValue('expiry', raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw)
  }

  const fillAddressFromNominatim = useCallback(
    (addr) => {
      const street = [addr.house_number, addr.road].filter(Boolean).join(' ')
      formik.setFieldValue('address', street || addr.suburb || '')
      formik.setFieldValue('city', addr.city || addr.town || addr.village || addr.county || '')
      formik.setFieldValue('state', addr.state || addr.region || '')
      formik.setFieldValue('zipCode', addr.postcode || '')

      const detectedCountry = addr.country || ''
      const matchedCountry = countries.find((country) => country.toLowerCase() === detectedCountry.toLowerCase())
      formik.setFieldValue('country', matchedCountry || detectedCountry)
    },
    [formik],
  )

  const reverseGeocode = async (latitude, longitude) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } },
    )
    if (!response.ok) throw new Error('Geocode request failed')
    const data = await response.json()
    return data.address || {}
  }

  const detectLocation = useCallback(() => {
    const requestId = geolocationRequestId.current + 1
    geolocationRequestId.current = requestId
    setGeoError('')
    setCoordinates(null)
    setGeoLoading(true)

    if (!window.isSecureContext) {
      setGeoError('Location access requires HTTPS or localhost. Open this site securely and try again.')
      setGeoLoading(false)
      return
    }

    if (!navigator.geolocation) {
      setGeoError('Your browser does not support location detection.')
      setGeoLoading(false)
      return
    }

    const handlePosition = async (position) => {
      if (geolocationRequestId.current !== requestId) return

      const { latitude, longitude } = position.coords
      setCoordinates({ latitude, longitude })

      try {
        const addr = await reverseGeocode(latitude, longitude)
        if (geolocationRequestId.current !== requestId) return
        fillAddressFromNominatim(addr)
        setGeoError('')
      } catch {
        if (geolocationRequestId.current === requestId) {
          setGeoError('Your coordinates were detected, but the address lookup failed. Enter your street, city, and postal code manually.')
        }
      } finally {
        if (geolocationRequestId.current === requestId) setGeoLoading(false)
      }
    }

    const handleLocationError = (error) => {
      if (geolocationRequestId.current !== requestId) return

      setGeoError(
        error.code === 1
          ? `The browser denied this page's location request: ${error.message}. Check this site's permission, browser policies, and Windows Location services.`
          : error.code === 2
            ? `Your device could not determine your location${error.message ? `: ${error.message}` : '.'} Check that Windows Location services are enabled, then try again or enter your address manually.`
            : error.code === 3
              ? `Location detection timed out${error.message ? `: ${error.message}` : '.'} Try again or enter your address manually.`
              : error.message || 'Could not detect your location. Enter your address manually.',
      )
      setGeoLoading(false)
    }

    navigator.geolocation.getCurrentPosition(handlePosition, handleLocationError)
  }, [fillAddressFromNominatim])

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/checkout' }} replace />
  }

  if (submitted) {
    return (
      <div className="container-x py-16 md:py-24">
        <div className="mx-auto max-w-xl animate-fade-up text-center">
          <div className="flex justify-center"><Steps current={2} /></div>
          <CheckCircleRoundedIcon sx={{ fontSize: 72 }} className="mt-14 text-gold" />
          <p className="eyebrow mt-6">Order confirmed</p>
          <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">Thank you, {user?.firstName}</h1>
          <p className="mx-auto mt-5 max-w-md leading-relaxed text-stone">
            Your order is being prepared with care. A confirmation with tracking details will be sent to{' '}
            <strong className="text-ink">{user?.email}</strong>.
          </p>
          {orderNumber && (
            <p className="mx-auto mt-8 inline-block bg-surface px-6 py-4 text-sm ring-1 ring-line">
              Order number <strong className="ml-2 font-mono tracking-wider">{orderNumber}</strong>
            </p>
          )}
          <div className="mt-10">
            <Link to="/" className="btn-primary">Continue shopping</Link>
          </div>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0) {
    return (
      <div className="container-x py-24 text-center">
        <h1 className="font-display text-4xl">Your bag is empty</h1>
        <p className="mt-4 text-stone">Add a piece or two before checking out.</p>
        <Link to="/" className="btn-primary mt-10">Browse the collection</Link>
      </div>
    )
  }

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2"><LockOutlinedIcon sx={{ fontSize: 14 }} /> Secure checkout</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Complete your order</h1>
          <p className="mt-3 text-sm text-stone">
            Ordering as <strong className="text-ink">{user?.firstName} {user?.lastName}</strong> ({user?.email})
          </p>
        </div>
        <Steps current={1} />
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
        <form onSubmit={formik.handleSubmit} noValidate className="relative space-y-6">
          <CheckoutSection step={1} title="Contact">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField {...fieldProps('fullName')} label="Full name" autoComplete="name" />
              <TextField {...fieldProps('email')} label="Email address" type="email" autoComplete="email" />
            </div>
          </CheckoutSection>

          <CheckoutSection
            step={2}
            title="Shipping address"
            action={
              <button
                type="button"
                onClick={detectLocation}
                disabled={geoLoading}
                className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-semibold transition hover:border-ink disabled:opacity-50"
              >
                {geoLoading ? <CircularProgress size={14} color="inherit" /> : <MyLocationRoundedIcon sx={{ fontSize: 16 }} />}
                {geoLoading ? 'Detecting…' : 'Use my location'}
              </button>
            }
          >
            {geoLoading && <Alert severity="info" role="status">Fetching your coordinates and address…</Alert>}
            {geoError && <Alert severity="warning">{geoError}</Alert>}
            {coordinates && !geoLoading && (
              <p className="text-xs tabular-nums text-stone" role="status">
                Location detected: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
              </p>
            )}
            <TextField {...fieldProps('address')} label="Street address" autoComplete="street-address" />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField {...fieldProps('city')} label="City" autoComplete="address-level2" />
              <TextField {...fieldProps('state')} label="State / Province" autoComplete="address-level1" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField {...fieldProps('zipCode')} label="Postal code" autoComplete="postal-code" />
              <TextField {...fieldProps('country')} label="Country" select>
                {countries.map((country) => (
                  <MenuItem key={country} value={country}>{country}</MenuItem>
                ))}
              </TextField>
            </div>
          </CheckoutSection>

          <CheckoutSection step={3} title="Payment">
            <div className="grid items-start gap-8 xl:grid-cols-[1fr_auto]">
              <div className="space-y-5">
                <TextField {...fieldProps('cardName')} label="Name on card" autoComplete="cc-name" />
                <TextField
                  {...fieldProps('cardNumber')}
                  onChange={handleCardNumberChange}
                  label="Card number"
                  placeholder="1234 5678 9012 3456"
                  autoComplete="cc-number"
                  slotProps={{ htmlInput: { maxLength: 19, inputMode: 'numeric' } }}
                />
                <div className="grid grid-cols-2 gap-5">
                  <TextField
                    {...fieldProps('expiry')}
                    onChange={handleExpiryChange}
                    label="Expiry (MM/YY)"
                    placeholder="MM/YY"
                    autoComplete="cc-exp"
                    slotProps={{ htmlInput: { maxLength: 5, inputMode: 'numeric' } }}
                  />
                  <TextField
                    {...fieldProps('cvv')}
                    label="CVV"
                    placeholder="123"
                    autoComplete="cc-csc"
                    slotProps={{ htmlInput: { maxLength: 4, inputMode: 'numeric' } }}
                  />
                </div>
              </div>
              <div className="flex justify-center xl:w-80">
                <CardPreview name={formik.values.cardName} number={formik.values.cardNumber} expiry={formik.values.expiry} />
              </div>
            </div>
          </CheckoutSection>

          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
            <label htmlFor="company">Company</label>
            <input
              type="text"
              id="company"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              value={formik.values.company}
              onChange={formik.handleChange}
            />
          </div>

          <button type="submit" disabled={formik.isSubmitting} className="btn-primary h-16 w-full text-[13px]">
            {formik.isSubmitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              <>
                <LockOutlinedIcon sx={{ fontSize: 18 }} /> Pay {money(total)}
              </>
            )}
          </button>
          <p className="text-center text-xs text-stone">Your payment details are encrypted and never stored.</p>
        </form>

        <aside className="lg:sticky lg:top-28 lg:self-start" aria-labelledby="checkout-summary-title">
          <div className="bg-surface p-7 ring-1 ring-line sm:p-8">
            <h2 id="checkout-summary-title" className="font-display text-2xl">Order summary</h2>
            <ul className="mt-6 space-y-5">
              {cartItems.map((item) => (
                <li key={item.id} className="flex items-center gap-4">
                  <span className="relative h-16 w-16 shrink-0 bg-sand p-1.5">
                    <img src={item.thumbnail} alt="" className="h-full w-full object-contain" />
                    <span className="absolute -right-2 -top-2 grid h-5 min-w-[20px] place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold text-ivory">
                      {item.quantity ?? 1}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-display text-sm leading-snug">{item.title}</span>
                  </span>
                  <span className="text-sm font-semibold">{money(item.price * (item.quantity ?? 1))}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-8 space-y-3 border-t border-line pt-6 text-sm">
              <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{money(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone">Tax (8%)</dt><dd>{money(tax)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone">Shipping</dt><dd>{shipping === 0 ? 'Complimentary' : money(shipping)}</dd></div>
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <dt className="font-semibold uppercase tracking-[0.14em]">Total</dt>
                <dd className="font-display text-3xl">{money(total)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CheckoutForm
