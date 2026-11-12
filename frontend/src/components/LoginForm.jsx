import { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, CircularProgress, IconButton, InputAdornment, TextField } from '@mui/material'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { dismissExpired, login } from '../toolkit/authSlice'
import { isStaff } from '../utils/roles'
import AuthLayout, { FormDivider } from './AuthLayout'
import usePageMeta from '../hooks/usePageMeta'

const loginSchema = Yup.object({
  email: Yup.string().email('Please enter a valid email address').required('Email is required'),
  password: Yup.string().min(3, 'Password must be at least 3 characters')
    .required('Password is required'),
})

function LoginForm() {
  usePageMeta({ title: 'Sign in', noindex: true })
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const from = location.state?.from || '/'
  const expired = useSelector((state) => state.auth.expired)

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      setLoginError('')

      try {
        const user = await dispatch(login({ email: values.email.trim(), password: values.password })).unwrap()
        // Admins and staff only use the management area; send them back to the admin page they were on, if any.
        navigate(isStaff(user) ? (from.startsWith('/admin') ? from : '/admin') : from, { replace: true })
      } catch (message) {
        setLoginError(message || 'Something went wrong. Please try again.')
      }
    },
  })

  const fieldProps = (name) => {
    const invalid = formik.touched[name] && Boolean(formik.errors[name])
    return {
      id: `login-${name}`,
      name,
      value: formik.values[name],
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: invalid,
      helperText: invalid ? formik.errors[name] : undefined,
    }
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-4xl leading-tight md:text-[44px]">Sign in</h1>
      <p className="mt-3 leading-relaxed text-stone">Access your bag, check out faster and follow your orders.</p>

      {expired ? (
        <Alert severity="warning" className="mt-6" onClose={() => dispatch(dismissExpired())}>
          Your session has expired. Please sign in again to continue{from !== '/' ? ' where you left off' : ''}.
        </Alert>
      ) : from !== '/' && (
        <Alert severity="info" className="mt-6">
          Please sign in to continue to {from === '/checkout' ? 'checkout' : 'that page'}.
        </Alert>
      )}

      <form onSubmit={formik.handleSubmit} noValidate className="mt-10 space-y-5">
        <TextField {...fieldProps('email')} label="Email address" type="email" autoComplete="email" />
        <TextField
          {...fieldProps('password')}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((value) => !value)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <div className="-mt-1 text-right">
          <Link
            to="/forgot-password"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone underline-offset-4 hover:text-ink hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {loginError && <Alert severity="error">{loginError}</Alert>}

        <button type="submit" disabled={formik.isSubmitting} className="btn-primary h-14 w-full">
          {formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Sign in'}
        </button>
      </form>

      <FormDivider>New to goodthings?</FormDivider>
      <Link to="/signup" state={{ from }} className="btn-outline w-full">
        Create an account
      </Link>
    </AuthLayout>
  )
}

export default LoginForm
