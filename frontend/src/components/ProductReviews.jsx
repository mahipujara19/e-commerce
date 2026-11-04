import { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, CircularProgress, Rating, TextField } from '@mui/material'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import { Link, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { submitReview } from '../toolkit/productslice'
import { formatDate } from '../utils/format'
import SectionHeading from './SectionHeading'

const INITIAL_VISIBLE = 6

const reviewSchema = Yup.object({
  rating: Yup.number().min(1, 'Please choose a rating').max(5).required('Please choose a rating'),
  comment: Yup.string()
    .trim()
    .min(3, 'Please write at least a few words')
    .max(1000, 'Reviews must be under 1000 characters')
    .required('Please write a short review'),
})

function ReviewForm({ product, existing, onDone }) {
  const dispatch = useDispatch()
  const [submitError, setSubmitError] = useState('')

  const formik = useFormik({
    initialValues: { rating: existing?.rating ?? 0, comment: existing?.comment ?? '' },
    validationSchema: reviewSchema,
    onSubmit: async (values) => {
      setSubmitError('')
      try {
        await dispatch(submitReview({ id: product.id, rating: values.rating, comment: values.comment.trim() })).unwrap()
        onDone()
      } catch (message) {
        setSubmitError(message)
      }
    },
  })

  const commentInvalid = formik.touched.comment && Boolean(formik.errors.comment)
  const ratingInvalid = formik.submitCount > 0 && Boolean(formik.errors.rating)

  return (
    <form onSubmit={formik.handleSubmit} noValidate className="mt-10 animate-fade-in bg-surface p-6 ring-1 ring-line sm:p-8">
      <h3 className="font-display text-2xl">{existing ? 'Update your review' : 'Write a review'}</h3>
      <fieldset className="mt-6">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">Your rating</legend>
        <Rating
          name="rating"
          value={formik.values.rating}
          onChange={(_, value) => formik.setFieldValue('rating', value ?? 0)}
          size="large"
          className="mt-2"
        />
        {ratingInvalid && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{formik.errors.rating}</p>}
      </fieldset>
      <div className="mt-6">
        <TextField
          id="review-comment"
          name="comment"
          label="Your review"
          multiline
          minRows={4}
          value={formik.values.comment}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          error={commentInvalid}
          helperText={commentInvalid ? formik.errors.comment : `${formik.values.comment.length}/1000`}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
      </div>

      {submitError && <Alert severity="error" className="mt-5">{submitError}</Alert>}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className="btn-outline">Cancel</button>
        <button type="submit" disabled={formik.isSubmitting} className="btn-primary min-w-[180px]">
          {formik.isSubmitting ? <CircularProgress size={18} color="inherit" /> : existing ? 'Update review' : 'Publish review'}
        </button>
      </div>
    </form>
  )
}

function ReviewPrompt({ product, existing, onWrite }) {
  const location = useLocation()
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const emailVerified = useSelector((state) => state.auth.user?.emailVerified)

  if (!isAuthenticated) {
    return (
      <Link to="/login" state={{ from: `${location.pathname}#reviews` }} className="btn-outline">
        Sign in to review
      </Link>
    )
  }

  if (!emailVerified) {
    return (
      <p className="max-w-xs text-sm text-stone md:text-right">
        <Link to="/account" className="font-semibold text-ink underline underline-offset-4 hover:text-gold">Verify your email</Link>{' '}
        to review {product.title}.
      </p>
    )
  }

  return (
    <button type="button" onClick={onWrite} className="btn-outline">
      <RateReviewOutlinedIcon sx={{ fontSize: 18 }} />
      {existing ? 'Edit your review' : 'Write a review'}
    </button>
  )
}

function ProductReviews({ product }) {
  const userId = useSelector((state) => state.auth.user?.id)
  const [writing, setWriting] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const reviews = [...(product.reviews ?? [])].sort((a, b) => new Date(b.date) - new Date(a.date))
  const existing = userId ? reviews.find((review) => review.user === userId) : undefined
  const visible = showAll ? reviews : reviews.slice(0, INITIAL_VISIBLE)
  const count = reviews.length

  return (
    <section id="reviews" className="mt-16 scroll-mt-28 md:mt-24" aria-labelledby="product-reviews-title">
      <SectionHeading
        id="product-reviews-title"
        title={count ? `${product.rating.toFixed(1)} out of 5` : 'Reviews'}
        description={
          count
            ? `Based on ${count} ${count === 1 ? 'review' : 'reviews'}.`
            : 'No reviews yet. Be the first to share your thoughts on this piece.'
        }
        action={!writing && <ReviewPrompt product={product} existing={existing} onWrite={() => setWriting(true)} />}
      />

      {writing && <ReviewForm product={product} existing={existing} onDone={() => setWriting(false)} />}

      {count > 0 && (
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {visible.map((review) => (
            <figure key={`${review.reviewerName}-${review.date}`} className="bg-surface p-7 ring-1 ring-line">
              <div className="flex items-center justify-between gap-3">
                <Rating value={review.rating} readOnly size="small" />
                {review.user && review.user === userId && (
                  <span className="bg-gold-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Your review</span>
                )}
              </div>
              <blockquote className="mt-4 font-display text-xl leading-snug">“{review.comment}”</blockquote>
              <figcaption className="mt-6 text-sm">
                <span className="font-semibold">{review.reviewerName}</span>
                <span className="text-stone"> · {formatDate(review.date, { month: 'short', year: 'numeric' })}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      {count > INITIAL_VISIBLE && (
        <div className="mt-10 text-center">
          <button type="button" onClick={() => setShowAll((value) => !value)} className="btn-outline">
            {showAll ? 'Show fewer reviews' : `Show all ${count} reviews`}
          </button>
        </div>
      )}
    </section>
  )
}

export default ProductReviews
