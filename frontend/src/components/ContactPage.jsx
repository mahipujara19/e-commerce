import { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, CircularProgress, MenuItem, TextField } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { Link, useSearchParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import usePageMeta from '../hooks/usePageMeta'
import { api } from '../utils/api'
import { STORE } from '../utils/storeInfo'

// Mirrors CONTACT_TOPICS in backend/routes/supportRoutes.js.
const TOPICS = ['Order help', 'Returns & refunds', 'Product question', 'Account', 'Other']

const schema = Yup.object({
  name: Yup.string().trim().min(2, 'Please enter your name').max(100).required('Please enter your name'),
  email: Yup.string().trim().email('Please enter a valid email address').required('Email is required'),
  topic: Yup.string().oneOf(TOPICS).required('Please choose a topic'),
  reference: Yup.string().trim().max(30, 'That order number is too long'),
  message: Yup.string().trim().min(10, 'Please tell us a little more (at least 10 characters)').max(3000).required('Please write a message'),
})

function ContactPage() {
  const user = useSelector((state) => state.auth.user)
  const [params] = useSearchParams()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  usePageMeta({ title: 'Contact us', description: 'Questions about an order, a return or a product? Our team usually replies within one business day.' })

  const formik = useFormik({
    initialValues: {
      name: user ? `${user.firstName} ${user.lastName}`.trim() : '',
      email: user?.email ?? '',
      topic: params.get('order') ? 'Order help' : '',
      reference: params.get('order') ?? '',
      message: '',
      website: '',
    },
    validationSchema: schema,
    onSubmit: async (values) => {
      setError('')
      try {
        await api('/contact', { method: 'POST', body: { ...values, reference: values.reference || undefined } })
        setSent(true)
      } catch (requestError) {
        setError(requestError.message)
      }
    },
  })

  const fieldProps = (name) => {
    const invalid = formik.touched[name] && Boolean(formik.errors[name])
    return {
      id: `contact-${name}`,
      name,
      value: formik.values[name],
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: invalid,
      helperText: invalid ? formik.errors[name] : undefined,
    }
  }

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-20">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl md:text-5xl">Contact us</h1>
          <p className="mt-4 text-lg leading-relaxed text-stone">
            We usually reply within one business day. For quick answers, see our <Link to="/faq" className="text-ink underline">FAQ</Link>.
          </p>

          {sent ? (
            <div className="mt-10 bg-surface p-8 text-center ring-1 ring-line" role="status">
              <CheckCircleRoundedIcon sx={{ fontSize: 56 }} className="text-gold" />
              <h2 className="mt-4 font-display text-3xl">Message sent</h2>
              <p className="mt-3 text-stone">Thank you. We will reply to {formik.values.email} as soon as we can.</p>
              <Link to="/shop" className="btn-outline mt-8">Continue shopping</Link>
            </div>
          ) : (
            <form onSubmit={formik.handleSubmit} noValidate className="relative mt-10 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField {...fieldProps('name')} label="Your name" autoComplete="name" />
                <TextField {...fieldProps('email')} label="Email address" type="email" autoComplete="email" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField {...fieldProps('topic')} label="Topic" select>
                  {TOPICS.map((topic) => <MenuItem key={topic} value={topic}>{topic}</MenuItem>)}
                </TextField>
                <TextField {...fieldProps('reference')} label="Order number (optional)" placeholder="GT-…" />
              </div>
              <TextField {...fieldProps('message')} label="How can we help?" multiline minRows={6} />

              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" value={formik.values.website} onChange={formik.handleChange} />
              </div>

              {error && <Alert severity="error" role="alert">{error}</Alert>}

              <button type="submit" disabled={formik.isSubmitting} className="btn-primary h-14 w-full sm:w-auto sm:min-w-[220px]">
                {formik.isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Send message'}
              </button>
              <p className="text-xs text-stone">
                We use your details only to answer your message. See our <Link to="/privacy" className="underline">privacy policy</Link>.
              </p>
            </form>
          )}
        </div>

        <aside className="space-y-6 lg:pt-24">
          <div className="space-y-5 bg-surface p-7 text-sm ring-1 ring-line">
            {STORE.supportEmail && (
              <p className="flex items-start gap-3">
                <MailOutlineRoundedIcon sx={{ fontSize: 20 }} className="text-gold" />
                <a href={`mailto:${STORE.supportEmail}`} className="break-all underline-offset-4 hover:underline">{STORE.supportEmail}</a>
              </p>
            )}
            {STORE.supportPhone && (
              <p className="flex items-start gap-3">
                <PhoneOutlinedIcon sx={{ fontSize: 20 }} className="text-gold" />
                <a href={`tel:${STORE.supportPhone.replace(/[^\d+]/g, '')}`} className="underline-offset-4 hover:underline">{STORE.supportPhone}</a>
              </p>
            )}
            <p className="flex items-start gap-3">
              <ScheduleRoundedIcon sx={{ fontSize: 20 }} className="text-gold" />
              <span>{STORE.supportHours}</span>
            </p>
            {STORE.address && <p className="border-t border-line pt-5 leading-relaxed text-stone">{STORE.legalName}<br />{STORE.address}</p>}
          </div>
          <ul className="space-y-2 px-1 text-sm">
            <li><Link to="/shipping" className="underline-offset-4 hover:underline">Shipping policy</Link></li>
            <li><Link to="/returns" className="underline-offset-4 hover:underline">Returns &amp; refunds</Link></li>
            <li><Link to="/account?tab=orders" className="underline-offset-4 hover:underline">Track an order</Link></li>
          </ul>
        </aside>
      </div>
    </div>
  )
}

export default ContactPage
