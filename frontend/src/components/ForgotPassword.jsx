import { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, CircularProgress, TextField } from '@mui/material'
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import AuthLayout, { FormDivider } from './AuthLayout'
import usePageMeta from '../hooks/usePageMeta'

const forgotSchema = Yup.object({
  email: Yup.string().email('Please enter a valid email address').required('Email is required'),
})

function ForgotPassword() {
  usePageMeta({ title: 'Reset your password', noindex: true })
  const [sentTo, setSentTo] = useState('')
  const [requestError, setRequestError] = useState('')

  const formik = useFormik({
    initialValues: { email: '' },
    validationSchema: forgotSchema,
    onSubmit: async (values) => {
      setRequestError('')
      try {
        const email = values.email.trim()
        await api('/auth/forgot-password', { method: 'POST', body: { email } })
        setSentTo(email)
      } catch (error) {
        setRequestError(error.message)
      }
    },
  })

  const invalid = formik.touched.email && Boolean(formik.errors.email)

  if (sentTo) {
    return (
      <AuthLayout>
        <div className="text-center">
          <MarkEmailReadOutlinedIcon sx={{ fontSize: 64 }} className="text-gold" />
          <h1 className="mt-6 font-display text-4xl leading-tight">Check your inbox</h1>
          <p className="mt-4 leading-relaxed text-stone">
            If an account exists for <strong className="text-ink">{sentTo}</strong>, you&apos;ll receive a link to choose a
            new password. It expires in one hour.
          </p>
          <Link to="/login" className="btn-primary mt-10 w-full">Back to sign in</Link>
          <button
            type="button"
            onClick={() => setSentTo('')}
            className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone underline-offset-4 hover:text-ink hover:underline"
          >
            Use a different email
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="font-display text-4xl leading-tight md:text-[44px]">Forgot your password?</h1>
      <p className="mt-3 leading-relaxed text-stone">Enter the email you shop with and we&apos;ll send you a link to reset it.</p>

      <form onSubmit={formik.handleSubmit} noValidate className="mt-10 space-y-5">
        <TextField
          id="forgot-email"
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          value={formik.values.email}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={invalid}
          helperText={invalid ? formik.errors.email : undefined}
        />

        {requestError && <Alert severity="error">{requestError}</Alert>}

        <button type="submit" disabled={formik.isSubmitting} className="btn-primary h-14 w-full">
          {formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Send reset link'}
        </button>
      </form>

      <FormDivider>Remembered it?</FormDivider>
      <Link to="/login" className="btn-outline w-full">Back to sign in</Link>
    </AuthLayout>
  )
}

export default ForgotPassword
