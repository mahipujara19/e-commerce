import { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, CircularProgress, IconButton, InputAdornment, TextField } from '@mui/material'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { login, loadRegisteredUsers } from '../toolkit/authSlice'
import AuthLayout, { FormDivider } from './AuthLayout'

const loginSchema = Yup.object({
  email: Yup.string().email('Please enter a valid email address').required('Email is required'),
  password: Yup.string().required('Password is required'),
})

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const from = location.state?.from || '/'

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      setLoginError('')
      await new Promise((resolve) => setTimeout(resolve, 800))

      try {
        const normalizedEmail = values.email.trim().toLowerCase()
        const matchedUser = loadRegisteredUsers().find((user) => String(user.email).trim().toLowerCase() === normalizedEmail)

        if (!matchedUser) {
          setLoginError('No account found with this email. Please create one first.')
          return
        }
        if (String(matchedUser.password) !== String(values.password)) {
          setLoginError('Incorrect password. Please try again.')
          return
        }

        dispatch(login(matchedUser))
        navigate(from, { replace: true })
      } catch {
        setLoginError('Something went wrong. Please try again.')
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
      <p className="eyebrow">Welcome back</p>
      <h1 className="mt-4 font-display text-4xl leading-tight md:text-[44px]">Sign in</h1>
      <p className="mt-3 leading-relaxed text-stone">Access your bag, check out faster and follow your orders.</p>

      {from !== '/' && (
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
