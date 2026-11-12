import { useEffect, useRef, useState } from 'react'
import { CircularProgress } from '@mui/material'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded'
import { Link, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { verifyEmail } from '../toolkit/authSlice'
import AuthLayout from './AuthLayout'
import usePageMeta from '../hooks/usePageMeta'

function VerifyEmail() {
  usePageMeta({ title: 'Verify your email', noindex: true })
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const [result, setResult] = useState({ status: 'loading', message: '' })
  // Tokens are single-use, so StrictMode's second effect run must not send it again.
  const requested = useRef(false)

  useEffect(() => {
    if (requested.current) return
    requested.current = true

    dispatch(verifyEmail(token))
      .unwrap()
      .then(() => setResult({ status: 'verified', message: '' }))
      .catch((message) => setResult({ status: 'failed', message }))
  }, [dispatch, token])

  return (
    <AuthLayout>
      <div className="text-center" aria-live="polite">
        {result.status === 'loading' && (
          <>
            <CircularProgress size={48} sx={{ color: 'rgb(var(--gold))' }} />
            <h1 className="mt-8 font-display text-4xl leading-tight">Verifying your email…</h1>
          </>
        )}

        {result.status === 'verified' && (
          <>
            <CheckCircleRoundedIcon sx={{ fontSize: 64 }} className="text-gold" />
            <h1 className="mt-6 font-display text-4xl leading-tight">You&apos;re verified</h1>
            <p className="mt-4 leading-relaxed text-stone">
              Thank you for confirming your email. You can now write reviews and we&apos;ll keep you updated on your orders.
            </p>
            <Link to={isAuthenticated ? '/shop' : '/login'} className="btn-primary mt-10 w-full">
              {isAuthenticated ? 'Continue shopping' : 'Sign in'}
            </Link>
          </>
        )}

        {result.status === 'failed' && (
          <>
            <LinkOffRoundedIcon sx={{ fontSize: 64 }} className="text-gold" />
            <h1 className="mt-6 font-display text-4xl leading-tight">We couldn&apos;t verify your email</h1>
            <p className="mt-4 leading-relaxed text-ink">{result.message}</p>
            <p className="mt-2 text-sm leading-relaxed text-stone">
              Verification links can only be used once and last 24 hours. You can request a new one from your account.
            </p>
            <Link to="/account" className="btn-primary mt-10 w-full">Go to your account</Link>
          </>
        )}
      </div>
    </AuthLayout>
  )
}

export default VerifyEmail
