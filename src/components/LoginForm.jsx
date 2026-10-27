import { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
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
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { login, loadRegisteredUsers } from '../toolkit/authSlice'

/**
 * ──────────────────────────────────────────────
 * LoginForm — User sign-in form
 * ──────────────────────────────────────────────
 *
 * Flow:
 * 1. User enters email + password
 * 2. Formik validates with Yup schema
 * 3. On submit, checks localStorage for a matching registered user
 * 4. If found, dispatches login() and redirects to where they came from
 *    (e.g., /checkout if they were trying to buy something)
 * 5. If not found, shows an error message
 *
 * The "from" location is passed via React Router's location.state
 * so we can redirect back after login (e.g., user tried to checkout → login → checkout)
 */

// ── Yup validation schema for login ──
const loginSchema = Yup.object({
  email: Yup.string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(1, 'Password is required')
    .required('Password is required'),
})

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()

  // Where to redirect after successful login (default: home)
  const from = location.state?.from || '/'

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema: loginSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setLoginError('')

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Check the registeredUsers store — this persists across logouts
      // so users who signed up previously can always log back in.
      // In a real app, this would be a POST to your auth API.
      try {
        const registeredUsers = loadRegisteredUsers()
        const matchedUser = registeredUsers.find((u) => u.email === values.email)
        if (matchedUser) {
          // Match found — log them in with their stored profile
          dispatch(login(matchedUser))
          navigate(from, { replace: true })
        } else {
          setLoginError('No account found with this email. Please sign up first.')
        }
      } catch {
        setLoginError('Something went wrong. Please try again.')
      }

      setSubmitting(false)
    },
  })

  // Helper: returns true if a field has been touched AND has an error
  const hasError = (field) => formik.touched[field] && Boolean(formik.errors[field])

  return (
    <section className="form-page" aria-labelledby="login-title">
      <div className="form-card">
        {/* ── Form header ── */}
        <span className="eyebrow">WELCOME BACK</span>
        <Typography component="h1" id="login-title" className="form-title">
          Sign in to your account
        </Typography>
        <Typography className="form-subtitle">
          Access your saved addresses, order history, and checkout faster.
        </Typography>

        {/* Show where the user will be redirected after login */}
        {from !== '/' && (
          <Alert severity="info" className="login-redirect-notice">
            Please sign in to continue to {from === '/checkout' ? 'checkout' : 'that page'}.
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit} noValidate className="form-fields">
          {/* ── Email field ── */}
          <TextField
            id="login-email"
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

          {/* ── Password field with show/hide toggle ── */}
          <TextField
            id="login-password"
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

          {/* ── Login error message ── */}
          {loginError && (
            <Alert severity="error" className="login-error">
              {loginError}
            </Alert>
          )}

          {/* ── Submit button ── */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={formik.isSubmitting}
            className="form-submit-btn"
          >
            {formik.isSubmitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              'Sign in'
            )}
          </Button>

          {/* ── Link to signup for new users ── */}
          <Typography className="form-footer-text">
            Don&apos;t have an account?{' '}
            <Link to="/signup" state={{ from }} className="form-link">
              Create one
            </Link>
          </Typography>
        </form>
      </div>
    </section>
  )
}

export default LoginForm
