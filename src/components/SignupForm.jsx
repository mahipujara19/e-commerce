import { useState, useRef } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import ReCAPTCHA from 'react-google-recaptcha'
import {
  Alert,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { signup } from '../toolkit/authSlice'

/**
 * ──────────────────────────────────────────────
 * SignupForm — User registration form
 * ──────────────────────────────────────────────
 *
 * Features:
 * 1. Formik for form state management + Yup for schema-based validation
 * 2. Field-level error messages shown on blur (touched + error)
 * 3. Submit button disabled while form is submitting
 * 4. On success: dispatches signup() to Redux → user is auto-logged in
 * 5. Redirects to the page the user came from (e.g., /checkout)
 * 6. Honeypot field — hidden field that bots fill in, humans never see
 * 7. Google reCAPTCHA v2 — user must solve the challenge before submitting
 * 8. Show/hide password toggle for better UX
 * 9. If already logged in, shows a message instead of the form
 */

// ── Yup validation schema ──
const signupSchema = Yup.object({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be under 50 characters')
    .required('First name is required'),

  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be under 50 characters')
    .required('Last name is required'),

  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),

  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*)')
    .required('Password is required'),

  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),

  phone: Yup.string()
    .matches(/^\+?[\d\s\-()]{7,15}$/, 'Please enter a valid phone number')
    .optional(),
})

// Replace with your real reCAPTCHA site key from Google
const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'

function SignupForm() {
  // Tracks whether form was successfully submitted
  const [submitted, setSubmitted] = useState(false)
  // Tracks whether the user has completed the reCAPTCHA challenge
  const [captchaToken, setCaptchaToken] = useState(null)
  // Show/hide password toggle states
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const recaptchaRef = useRef(null)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  // Check if user is already logged in
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const user = useSelector((state) => state.auth.user)

  // Where to redirect after signup (e.g., /checkout if user was trying to buy)
  const from = location.state?.from || '/'

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      // Honeypot field — must stay empty for real users
      website: '',
    },
    validationSchema: signupSchema,
    onSubmit: async (values, { setSubmitting }) => {
      // ── Honeypot check ──
      // If a bot filled in the hidden "website" field, silently pretend success
      if (values.website) {
        setSubmitted(true)
        setSubmitting(false)
        return
      }

      // ── reCAPTCHA check ──
      if (!captchaToken) {
        setSubmitting(false)
        return
      }

      // ── Simulate API call ──
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Dispatch signup action — saves to registeredUsers[] for future logins
      // AND logs the user in immediately via Redux + localStorage
      dispatch(signup({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      }))

      setSubmitted(true)
      setSubmitting(false)
    },
  })

  const handleCaptchaChange = (token) => setCaptchaToken(token)
  const handleCaptchaExpired = () => setCaptchaToken(null)
  const hasError = (field) => formik.touched[field] && Boolean(formik.errors[field])

  // ── Already logged in state ──
  if (isAuthenticated && !submitted) {
    return (
      <section className="form-page" aria-labelledby="signup-loggedin-title">
        <div className="form-card form-success">
          <CheckCircleOutlineRoundedIcon className="success-icon" />
          <Typography component="h1" id="signup-loggedin-title" className="form-title">
            You&apos;re already signed in
          </Typography>
          <Typography className="form-subtitle">
            Welcome back, {user?.firstName}! You&apos;re all set.
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

  // ── Success state — account created ──
  if (submitted) {
    return (
      <section className="form-page" aria-labelledby="signup-success-title">
        <div className="form-card form-success">
          <CheckCircleOutlineRoundedIcon className="success-icon" />
          <Typography component="h1" id="signup-success-title" className="form-title">
            Welcome aboard!
          </Typography>
          <Typography className="form-subtitle">
            Your account has been created successfully. Start exploring our collection.
          </Typography>
          <Button
            onClick={() => navigate(from, { replace: true })}
            variant="contained"
            className="form-submit-btn"
          >
            {from === '/checkout' ? 'Continue to checkout' : 'Start shopping'}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="form-page" aria-labelledby="signup-title">
      <div className="form-card">
        <span className="eyebrow">JOIN THE COMMUNITY</span>
        <Typography component="h1" id="signup-title" className="form-title">
          Create your account
        </Typography>
        <Typography className="form-subtitle">
          Sign up to save your favorites, track orders, and get early access to new arrivals.
        </Typography>

        {/* Show where the user will be redirected after signup */}
        {from !== '/' && (
          <Alert severity="info" className="login-redirect-notice">
            Create an account to continue to {from === '/checkout' ? 'checkout' : 'that page'}.
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit} noValidate className="form-fields">
          {/* ── Name fields (side by side) ── */}
          <div className="form-row">
            <TextField
              id="firstName"
              name="firstName"
              label="First name"
              fullWidth
              size="small"
              value={formik.values.firstName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={hasError('firstName')}
              helperText={hasError('firstName') ? formik.errors.firstName : ''}
              className="form-field"
            />
            <TextField
              id="lastName"
              name="lastName"
              label="Last name"
              fullWidth
              size="small"
              value={formik.values.lastName}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={hasError('lastName')}
              helperText={hasError('lastName') ? formik.errors.lastName : ''}
              className="form-field"
            />
          </div>

          {/* ── Email field ── */}
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

          {/* ── Phone field (optional) ── */}
          <TextField
            id="phone"
            name="phone"
            label="Phone number (optional)"
            type="tel"
            fullWidth
            size="small"
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={hasError('phone')}
            helperText={hasError('phone') ? formik.errors.phone : ''}
            className="form-field"
          />

          {/* ── Password field with show/hide toggle ── */}
          <TextField
            id="password"
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            size="small"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={hasError('password')}
            helperText={hasError('password') ? formik.errors.password : ''}
            className="form-field"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* ── Confirm password field ── */}
          <TextField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm password"
            type={showConfirmPassword ? 'text' : 'password'}
            fullWidth
            size="small"
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={hasError('confirmPassword')}
            helperText={hasError('confirmPassword') ? formik.errors.confirmPassword : ''}
            className="form-field"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* ── Honeypot field — hidden from humans, caught by bots ── */}
          <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={formik.values.website}
              onChange={formik.handleChange}
            />
          </div>

          {/* ── Google reCAPTCHA v2 ── */}
          <div className="form-captcha">
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              onChange={handleCaptchaChange}
              onExpired={handleCaptchaExpired}
            />
            {formik.submitCount > 0 && !captchaToken && (
              <Alert severity="warning" className="captcha-warning">
                Please complete the reCAPTCHA verification
              </Alert>
            )}
          </div>

          {/* ── Submit button — disabled while submitting or CAPTCHA unsolved ── */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={formik.isSubmitting || !captchaToken}
            className="form-submit-btn"
          >
            {formik.isSubmitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              'Create account'
            )}
          </Button>

          {/* ── Link to login for existing users ── */}
          <Typography className="form-footer-text">
            Already have an account?{' '}
            <Link to="/login" state={{ from }} className="form-link">
              Sign in
            </Link>
          </Typography>
        </form>
      </div>
    </section>
  )
}

export default SignupForm
