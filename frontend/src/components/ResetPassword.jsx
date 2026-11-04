import { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, CircularProgress, IconButton, InputAdornment, TextField } from '@mui/material'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { api } from '../utils/api'
import { notify } from '../toolkit/toastSlice'
import AuthLayout from './AuthLayout'

const resetSchema = Yup.object({
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*)')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
})

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [showPassword, setShowPassword] = useState(false)
  const [resetError, setResetError] = useState('')
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const formik = useFormik({
    initialValues: { password: '', confirmPassword: '' },
    validationSchema: resetSchema,
    onSubmit: async (values) => {
      setResetError('')
      try {
        await api('/auth/reset-password', { method: 'POST', body: { token, password: values.password } })
        dispatch(notify('Your password has been updated. Please sign in.'))
        navigate('/login', { replace: true })
      } catch (error) {
        setResetError(error.message)
      }
    },
  })

  const fieldProps = (name) => {
    const invalid = formik.touched[name] && Boolean(formik.errors[name])
    return {
      id: `reset-${name}`,
      name,
      value: formik.values[name],
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: invalid,
      helperText: invalid ? formik.errors[name] : undefined,
      type: showPassword ? 'text' : 'password',
      autoComplete: 'new-password',
    }
  }

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return (
      <AuthLayout>
        <div className="text-center">
          <LinkOffRoundedIcon sx={{ fontSize: 64 }} className="text-gold" />
          <h1 className="mt-6 font-display text-4xl leading-tight">This link isn&apos;t valid</h1>
          <p className="mt-4 leading-relaxed text-stone">Reset links can only be used once and expire after an hour.</p>
          <Link to="/forgot-password" className="btn-primary mt-10 w-full">Request a new link</Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-4xl leading-tight md:text-[44px]">Choose a new password</h1>
      <p className="mt-3 leading-relaxed text-stone">You&apos;ll be signed out on other devices once it&apos;s changed.</p>

      <form onSubmit={formik.handleSubmit} noValidate className="mt-10 space-y-5">
        <TextField
          {...fieldProps('password')}
          label="New password"
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
        <TextField {...fieldProps('confirmPassword')} label="Confirm new password" />

        {resetError && (
          <Alert severity="error">
            {resetError}{' '}
            <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link>
          </Alert>
        )}

        <button type="submit" disabled={formik.isSubmitting} className="btn-primary h-14 w-full">
          {formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Update password'}
        </button>
      </form>
    </AuthLayout>
  )
}

export default ResetPassword
