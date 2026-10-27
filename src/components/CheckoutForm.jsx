import { useState, useCallback, useRef } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded'
import EditLocationAltRoundedIcon from '@mui/icons-material/EditLocationAltRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import { Link, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { clearItem } from '../toolkit/slice'
import { addAddress, removeAddress } from '../toolkit/authSlice'

/**
 * ──────────────────────────────────────────────────
 * CheckoutForm — Shipping + Payment checkout form
 * ──────────────────────────────────────────────────
 *
 * E-commerce flow:
 * 1. AUTH GATE: If not logged in, redirects to /login with return path
 * 2. EMPTY CART: If cart is empty, shows prompt to browse products
 * 3. SAVED ADDRESSES: Shows user's saved addresses (from Redux auth state)
 * 4. GEOLOCATION: "Use my location" button detects address via browser
 *    Geolocation API + OpenStreetMap Nominatim reverse geocoding
 * 5. ADDRESS MANAGEMENT: Save new addresses, select saved ones, delete old ones
 * 6. MANUAL ENTRY: User can always type address manually
 * 7. Formik + Yup validation, honeypot, and card formatting
 */

// ── Yup validation schema for checkout ──
const checkoutSchema = Yup.object({
  fullName: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Full name is required'),
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  address: Yup.string()
    .min(5, 'Please enter your full street address')
    .required('Street address is required'),
  city: Yup.string()
    .min(2, 'City name is too short')
    .required('City is required'),
  state: Yup.string()
    .required('State / Province is required'),
  zipCode: Yup.string()
    .matches(/^[\d\w\s\-]{3,10}$/, 'Please enter a valid postal code')
    .required('Postal code is required'),
  country: Yup.string()
    .required('Country is required'),
  cardName: Yup.string()
    .min(2, 'Name on card is required')
    .required('Name on card is required'),
  cardNumber: Yup.string()
    .matches(/^[\d\s]{13,19}$/, 'Please enter a valid card number')
    .required('Card number is required'),
  expiry: Yup.string()
    .matches(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Please use MM/YY format')
    .required('Expiry date is required'),
  cvv: Yup.string()
    .matches(/^\d{3,4}$/, 'CVV must be 3 or 4 digits')
    .required('CVV is required'),
})

const countries = [
  'United States', 'Canada', 'United Kingdom', 'Australia',
  'Germany', 'France', 'India', 'Japan', 'Brazil', 'Mexico',
]

function CheckoutForm() {
  const [submitted, setSubmitted] = useState(false)
  const dispatch = useDispatch()

  // ── Auth state — redirect if not logged in ──
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const user = useSelector((state) => state.auth.user)
  const savedAddresses = useSelector((state) => state.auth.addresses)

  // ── Geolocation state ──
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [coordinates, setCoordinates] = useState(null)
  const geolocationRequestId = useRef(0)

  // ── Address mode: 'form' = manual entry, 'saved' = using a saved address ──
  const [addressMode, setAddressMode] = useState('form')
  const [selectedAddressId, setSelectedAddressId] = useState(null)

  // ── Cart data for order summary ──
  const cartItems = useSelector((state) => state.cart.items)
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * (item.quantity ?? 1), 0,
  )
  const tax = subtotal * 0.08
  const shipping = subtotal >= 75 ? 0 : 5.99
  const total = subtotal + tax + shipping

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
      // Honeypot field
      company: '',
    },
    validationSchema: checkoutSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      // ── Honeypot check ──
      if (values.company) {
        setSubmitted(true)
        setSubmitting(false)
        return
      }

      // ── Simulate payment processing ──
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Optionally save the address for future use
      const addressExists = savedAddresses.some(
        (a) => a.address === values.address && a.city === values.city
      )
      if (!addressExists && values.address) {
        dispatch(addAddress({
          address: values.address,
          city: values.city,
          state: values.state,
          zipCode: values.zipCode,
          country: values.country,
        }))
      }

      // Clear the cart after successful checkout
      dispatch(clearItem())
      setSubmitted(true)
      setSubmitting(false)
    },
  })

  const hasError = (field) => formik.touched[field] && Boolean(formik.errors[field])

  // Format card number into groups of 4
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ')
    formik.setFieldValue('cardNumber', formatted)
  }

  // Format expiry as MM/YY
  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    const formatted = raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw
    formik.setFieldValue('expiry', formatted)
  }

  /**
   * Helper: fill address fields from a Nominatim reverse-geocode response.
   * Used by both browser geolocation and IP-based fallback.
   */
  const fillAddressFromNominatim = useCallback((addr) => {
    const street = [addr.house_number, addr.road].filter(Boolean).join(' ')
    formik.setFieldValue('address', street || addr.suburb || '')
    formik.setFieldValue('city', addr.city || addr.town || addr.village || addr.county || '')
    formik.setFieldValue('state', addr.state || addr.region || '')
    formik.setFieldValue('zipCode', addr.postcode || '')

    const detectedCountry = addr.country || ''
    const matchedCountry = countries.find(
      (c) => c.toLowerCase() === detectedCountry.toLowerCase()
    )
    formik.setFieldValue('country', matchedCountry || detectedCountry)
    setAddressMode('form')
  }, [formik])

  /**
   * Reverse geocode lat/lng → address using OpenStreetMap Nominatim (free, no key).
   * Returns the address object or throws on failure.
   */
  const reverseGeocode = async (latitude, longitude) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (!response.ok) throw new Error('Geocode request failed')
    const data = await response.json()
    return data.address || {}
  }

  /**
   * ── Geolocation: Detect user's address ──
   *
   * Get coordinates from the browser's Geolocation API, then reverse-geocode
   * them into address fields. No IP-based fallback is used because it can
   * return an approximate location for a different area.
   */
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
          setGeoError(
            'Your coordinates were detected, but the address lookup failed. Enter your street, city, and postal code manually.'
          )
        }
      } finally {
        if (geolocationRequestId.current === requestId) {
          setGeoLoading(false)
        }
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
              : error.message || 'Could not detect your location. Enter your address manually.'
      )
      setGeoLoading(false)
    }

    navigator.geolocation.getCurrentPosition(handlePosition, handleLocationError)
  }, [formik, fillAddressFromNominatim])

  /**
   * ── Select a saved address ──
   * Fills the shipping fields with the saved address data
   */
  const selectSavedAddress = (addr) => {
    setSelectedAddressId(addr.id)
    formik.setFieldValue('address', addr.address)
    formik.setFieldValue('city', addr.city)
    formik.setFieldValue('state', addr.state)
    formik.setFieldValue('zipCode', addr.zipCode)
    formik.setFieldValue('country', addr.country)
    setAddressMode('saved')
  }

  // ── AUTH GATE: Redirect to login if not authenticated ──
  // This ensures users must sign up / sign in before purchasing
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/checkout' }} replace />
  }

  // ── Success state ──
  if (submitted) {
    return (
      <section className="form-page" aria-labelledby="checkout-success-title">
        <div className="form-card form-success">
          <CheckCircleOutlineRoundedIcon className="success-icon" />
          <Typography component="h1" id="checkout-success-title" className="form-title">
            Order confirmed!
          </Typography>
          <Typography className="form-subtitle">
            Thank you for your purchase, {user?.firstName}! We&apos;ll send a confirmation
            email to {user?.email} with tracking details shortly.
          </Typography>
          <Button
            component={Link}
            to="/"
            variant="contained"
            className="form-submit-btn"
          >
            Continue shopping
          </Button>
        </div>
      </section>
    )
  }

  // ── Empty cart ──
  if (cartItems.length === 0) {
    return (
      <section className="form-page" aria-labelledby="checkout-empty-title">
        <div className="form-card form-success">
          <Typography component="h1" id="checkout-empty-title" className="form-title">
            Your bag is empty
          </Typography>
          <Typography className="form-subtitle">
            Add some items to your bag before checking out.
          </Typography>
          <Button
            component={Link}
            to="/"
            variant="contained"
            className="form-submit-btn"
          >
            Browse products
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="form-page checkout-page" aria-labelledby="checkout-title">
      <div className="checkout-layout">
        {/* ── Left column: Form ── */}
        <div className="form-card">
          <span className="eyebrow">SECURE CHECKOUT</span>
          <Typography component="h1" id="checkout-title" className="form-title">
            Complete your order
          </Typography>
          {/* Greeting — shows the user they're logged in */}
          <Typography className="checkout-greeting">
            Ordering as <strong>{user?.firstName} {user?.lastName}</strong> ({user?.email})
          </Typography>

          <form onSubmit={formik.handleSubmit} noValidate className="form-fields">
            {/* ════════════════════════════════════════ */}
            {/* ── Section 1: Shipping Address ──       */}
            {/* ════════════════════════════════════════ */}
            <Typography component="h2" className="form-section-title">
              Shipping information
            </Typography>

            {/*
             * ── Geolocation button ──
             * Uses the browser's Geolocation API to auto-detect the user's address.
             * Calls Nominatim (OpenStreetMap) for reverse geocoding.
             */}
            <div className="address-actions">
              <Button
                onClick={detectLocation}
                disabled={geoLoading}
                startIcon={geoLoading ? <CircularProgress size={16} /> : <MyLocationRoundedIcon />}
                className="geo-detect-btn"
                variant="outlined"
                size="small"
              >
                {geoLoading ? 'Detecting…' : 'Use my location'}
              </Button>
              {addressMode === 'saved' && (
                <Button
                  onClick={() => { setAddressMode('form'); setSelectedAddressId(null) }}
                  startIcon={<EditLocationAltRoundedIcon />}
                  className="geo-detect-btn"
                  variant="outlined"
                  size="small"
                >
                  Enter new address
                </Button>
              )}
            </div>

            {/* Show geolocation error if detection failed */}
            {geoError && (
              <Alert severity="warning" className="geo-error" onClose={() => setGeoError('')}>
                {geoError}
              </Alert>
            )}
            {coordinates && (
            <Typography className="geo-coordinates" role="status">
              Location coordinates: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </Typography>
            )}

            {/*
             * ── Saved addresses ──
             * If the user has saved addresses from previous orders,
             * show them as selectable cards. The user can pick one or enter a new address.
             */}
            {savedAddresses.length > 0 && (
              <div className="saved-addresses">
                <Typography className="saved-addresses-label">
                  Your saved addresses
                </Typography>
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`saved-address-card ${selectedAddressId === addr.id ? 'saved-address-active' : ''}`}
                    onClick={() => selectSavedAddress(addr)}
                    onKeyDown={(e) => e.key === 'Enter' && selectSavedAddress(addr)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Use address: ${addr.address}, ${addr.city}`}
                  >
                    <div className="saved-address-text">
                      <Typography className="saved-address-line">{addr.address}</Typography>
                      <Typography className="saved-address-detail">
                        {addr.city}, {addr.state} {addr.zipCode} · {addr.country}
                      </Typography>
                    </div>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        dispatch(removeAddress(addr.id))
                        if (selectedAddressId === addr.id) {
                          setSelectedAddressId(null)
                          setAddressMode('form')
                        }
                      }}
                      aria-label="Delete this address"
                      className="saved-address-delete"
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}

            {/* ── Shipping form fields ── */}
            <TextField
              id="fullName"
              name="fullName"
              label="Full name"
              fullWidth
              size="small"
              value={formik.values.fullName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={hasError('fullName')}
              helperText={hasError('fullName') ? formik.errors.fullName : ''}
              className="form-field"
            />

            <TextField
              id="email"
              name="email"
              label="Email address"
              type="email"
              fullWidth
              size="small"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={hasError('email')}
              helperText={hasError('email') ? formik.errors.email : ''}
              className="form-field"
            />

            <TextField
              id="address"
              name="address"
              label="Street address"
              fullWidth
              size="small"
              value={formik.values.address}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={hasError('address')}
              helperText={hasError('address') ? formik.errors.address : ''}
              className="form-field"
            />

            <div className="form-row">
              <TextField
                id="city"
                name="city"
                label="City"
                fullWidth
                size="small"
                value={formik.values.city}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={hasError('city')}
                helperText={hasError('city') ? formik.errors.city : ''}
                className="form-field"
              />
              <TextField
                id="state"
                name="state"
                label="State / Province"
                fullWidth
                size="small"
                value={formik.values.state}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={hasError('state')}
                helperText={hasError('state') ? formik.errors.state : ''}
                className="form-field"
              />
            </div>

            <div className="form-row">
              <TextField
                id="zipCode"
                name="zipCode"
                label="Postal code"
                fullWidth
                size="small"
                value={formik.values.zipCode}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={hasError('zipCode')}
                helperText={hasError('zipCode') ? formik.errors.zipCode : ''}
                className="form-field"
              />
              <TextField
                id="country"
                name="country"
                label="Country"
                select
                fullWidth
                size="small"
                value={formik.values.country}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={hasError('country')}
                helperText={hasError('country') ? formik.errors.country : ''}
                className="form-field"
              >
                {countries.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
            </div>

            <Divider className="form-divider" />

            {/* ════════════════════════════════════════ */}
            {/* ── Section 2: Payment Details ──        */}
            {/* ════════════════════════════════════════ */}
            <Typography component="h2" className="form-section-title">
              Payment details
            </Typography>

            <TextField
              id="cardName"
              name="cardName"
              label="Name on card"
              fullWidth
              size="small"
              value={formik.values.cardName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={hasError('cardName')}
              helperText={hasError('cardName') ? formik.errors.cardName : ''}
              className="form-field"
            />

            <TextField
              id="cardNumber"
              name="cardNumber"
              label="Card number"
              fullWidth
              size="small"
              placeholder="1234 5678 9012 3456"
              value={formik.values.cardNumber}
              onChange={handleCardNumberChange}
              onBlur={formik.handleBlur}
              error={hasError('cardNumber')}
              helperText={hasError('cardNumber') ? formik.errors.cardNumber : ''}
              className="form-field"
              slotProps={{ htmlInput: { maxLength: 19, inputMode: 'numeric' } }}
            />

            <div className="form-row">
              <TextField
                id="expiry"
                name="expiry"
                label="Expiry (MM/YY)"
                fullWidth
                size="small"
                placeholder="MM/YY"
                value={formik.values.expiry}
                onChange={handleExpiryChange}
                onBlur={formik.handleBlur}
                error={hasError('expiry')}
                helperText={hasError('expiry') ? formik.errors.expiry : ''}
                className="form-field"
                slotProps={{ htmlInput: { maxLength: 5, inputMode: 'numeric' } }}
              />
              <TextField
                id="cvv"
                name="cvv"
                label="CVV"
                fullWidth
                size="small"
                placeholder="123"
                value={formik.values.cvv}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={hasError('cvv')}
                helperText={hasError('cvv') ? formik.errors.cvv : ''}
                className="form-field"
                slotProps={{ htmlInput: { maxLength: 4, inputMode: 'numeric' } }}
              />
            </div>

            {/* ── Honeypot field ── */}
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

            {/* ── Submit button ── */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={formik.isSubmitting}
              className="form-submit-btn"
              startIcon={!formik.isSubmitting && <LockOutlinedIcon />}
            >
              {formik.isSubmitting ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                `Pay $${total.toFixed(2)}`
              )}
            </Button>

            <Typography className="form-footer-text">
              Your payment is secure and encrypted.
            </Typography>
          </form>
        </div>

        {/* ── Right column: Order Summary ── */}
        <aside className="checkout-summary" aria-label="Order summary">
          <Typography component="h2" className="summary-title">
            Order summary
          </Typography>

          <div className="summary-items">
            {cartItems.map((item) => (
              <div className="summary-item" key={item.id}>
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="summary-item-image"
                />
                <div className="summary-item-info">
                  <Typography className="summary-item-name">
                    {item.title}
                  </Typography>
                  <Typography className="summary-item-qty">
                    Qty: {item.quantity ?? 1}
                  </Typography>
                </div>
                <Typography className="summary-item-price">
                  ${(item.price * (item.quantity ?? 1)).toFixed(2)}
                </Typography>
              </div>
            ))}
          </div>

          <Divider className="summary-divider" />

          <div className="summary-line">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-line">
            <span>Tax (8%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className="summary-line">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
          </div>
          <Divider className="summary-divider" />
          <div className="summary-line summary-total">
            <strong>Total</strong>
            <strong>${total.toFixed(2)}</strong>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default CheckoutForm
