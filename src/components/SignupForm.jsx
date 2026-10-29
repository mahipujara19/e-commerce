import { useRef, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import ReCAPTCHA from 'react-google-recaptcha'
import { Alert, CircularProgress, IconButton, InputAdornment, TextField } from '@mui/material'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { signup } from '../toolkit/authSlice'
import AuthLayout, { FormDivider } from './AuthLayout'

const PASSWORD_RULES = [
  { label: '8+ characters', test: (value) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { label: 'One number', test: (value) => /[0-9]/.test(value) },
  { label: 'One special (!@#$%^&*)', test: (value) => /[!@#$%^&*]/.test(value) },
]

const signupSchema = Yup.object({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be under 50 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be under 50 characters')
    .required('Last name is required'),
  email: Yup.string().email('Please enter a valid email address').required('Email is required'),
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

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY

function PasswordToggle({ visible, onToggle }) {
  return (
    <InputAdornment position="end">
      <IconButton aria-label={visible ? 'Hide password' : 'Show password'} onClick={onToggle} edge="end">
        {visible ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
      </IconButton>
    </InputAdornment>
  )
}

function SignupForm() {
  const [submitted, setSubmitted] = useState(false)
  const [captchaToken, setCaptchaToken] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const recaptchaRef = useRef(null)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const user = useSelector((state) => state.auth.user)
  const theme = useSelector((state) => state.ui.theme)
  const from = location.state?.from || '/'

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      website: '',
    },
    validationSchema: signupSchema,
    onSubmit: async (values, { setSubmitting }) => {
      if (values.website) {
        setSubmitted(true)
        setSubmitting(false)
        return
      }

      if (!captchaToken) {
        setSubmitting(false)
        return
      }

      await new Promise((resolve) => setTimeout(resolve, 1500))

      dispatch(
        signup({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          password: values.password,
        }),
      )

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

  const passedRules = PASSWORD_RULES.filter((rule) => rule.test(formik.values.password)).length

  if (submitted || isAuthenticated) {
    const justJoined = submitted
    return (
      <AuthLayout>
        <div className="text-center">
          <CheckCircleRoundedIcon sx={{ fontSize: 64 }} className="text-gold" />
          <h1 className="mt-6 font-display text-4xl leading-tight">
            {justJoined ? 'Your account is ready' : `Welcome back, ${user?.firstName}`}
          </h1>
          <p className="mt-4 leading-relaxed text-stone">
            {justJoined
              ? 'Your bag and orders are now saved to your account.'
              : 'You are already signed in and ready to shop.'}
          </p>
          <button
            type="button"
            onClick={() => navigate(justJoined ? from : '/', { replace: justJoined })}
            className="btn-primary mt-10 w-full"
          >
            {justJoined && from === '/checkout' ? 'Continue to checkout' : 'Start shopping'}
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-4xl leading-tight md:text-[44px]">Create your account</h1>
      <p className="mt-3 leading-relaxed text-stone">Save your bag, track your orders and receive early access to new arrivals.</p>

      {from !== '/' && (
        <Alert severity="info" className="mt-6">
          Create an account to continue to {from === '/checkout' ? 'checkout' : 'that page'}.
        </Alert>
      )}

      <form onSubmit={formik.handleSubmit} noValidate className="relative mt-10 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField {...fieldProps('firstName')} label="First name" autoComplete="given-name" />
          <TextField {...fieldProps('lastName')} label="Last name" autoComplete="family-name" />
        </div>
        <TextField {...fieldProps('email')} label="Email address" type="email" autoComplete="email" />
        <TextField {...fieldProps('phone')} label="Phone number (optional)" type="tel" autoComplete="tel" />

        <div>
          <TextField
            {...fieldProps('password')}
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            slotProps={{ input: { endAdornment: <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} /> } }}
          />
          {formik.values.password && (
            <div className="mt-3" aria-live="polite">
              <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
                {PASSWORD_RULES.map((rule, index) => (
                  <span key={rule.label} className={`h-1 transition-colors ${index < passedRules ? 'bg-gold' : 'bg-line'}`} />
                ))}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(formik.values.password)
                  return (
                    <li key={rule.label} className={`flex items-center gap-1.5 ${passed ? 'text-ink' : 'text-stone'}`}>
                      <CheckRoundedIcon sx={{ fontSize: 14 }} className={passed ? 'text-gold' : 'opacity-30'} />
                      {rule.label}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        <TextField
          {...fieldProps('confirmPassword')}
          label="Confirm password"
          type={showConfirmPassword ? 'text' : 'password'}
          autoComplete="new-password"
          slotProps={{ input: { endAdornment: <PasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((v) => !v)} /> } }}
        />

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

        <div className="flex flex-col items-center gap-3">
          {RECAPTCHA_SITE_KEY ? (
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey={RECAPTCHA_SITE_KEY}
              theme={theme}
              onChange={(token) => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken(null)}
            />
          ) : (
            <Alert severity="error" className="w-full">
              reCAPTCHA is not configured. Set VITE_RECAPTCHA_SITE_KEY in the app environment.
            </Alert>
          )}
          {formik.submitCount > 0 && !captchaToken && (
            <Alert severity="warning" className="w-full">Please complete the reCAPTCHA verification.</Alert>
          )}
        </div>

        <button type="submit" disabled={formik.isSubmitting || !captchaToken} className="btn-primary h-14 w-full">
          {formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Create account'}
        </button>
        <p className="text-center text-xs leading-relaxed text-stone">
          By creating an account you agree to receive order updates by email.
        </p>
      </form>

      <FormDivider>Already a member?</FormDivider>
      <Link to="/login" state={{ from }} className="btn-outline w-full">
        Sign in
      </Link>
    </AuthLayout>
  )
}

export default SignupForm
