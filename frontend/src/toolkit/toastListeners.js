import { createListenerMiddleware } from '@reduxjs/toolkit'
import { login, logout, sessionExpired, signup, updateProfile, verifyEmail } from './authSlice'
import { updateOrderStatus } from './orderSlice'
import { createUser, updateUserRole } from './customerSlice'
import { createProduct, deleteProduct, submitReview, updateProduct, updateStock } from './productslice'
import { removeItem } from './slice'
import { notify } from './toastSlice'
import { toggleWishlist } from './wishlistSlice'

/**
 * Turns finished actions into toasts, so components do not each need to.
 * Failures from forms that already show an inline error (login, signup, product form, review form)
 * are left out to avoid saying the same thing twice.
 */
export const toastListeners = createListenerMiddleware()

const on = (actionCreator, toast) =>
  toastListeners.startListening({
    actionCreator,
    effect: (action, { dispatch }) => dispatch(notify(typeof toast === 'function' ? toast(action) : toast)),
  })

const onError = (action) => ({ message: action.payload ?? 'Something went wrong. Please try again.', severity: 'error' })

on(login.fulfilled, (action) => `Welcome back, ${action.payload.firstName}`)
on(signup.fulfilled, (action) =>
  action.meta.verificationEmailSent === false
    ? { message: 'Welcome to goodthings. We could not send your verification email; you can resend it from your account.', severity: 'info' }
    : 'Welcome to goodthings. Check your inbox to verify your email.',
)
on(logout.fulfilled, { message: 'You have been signed out', severity: 'info' })
// Parallel requests can each report the expiry; only the first one, while still signed in, is shown.
toastListeners.startListening({
  actionCreator: sessionExpired,
  effect: (_action, { dispatch, getOriginalState }) => {
    if (getOriginalState().auth.isAuthenticated) {
      dispatch(notify({ message: 'Your session has expired. Please sign in again.', severity: 'info' }))
    }
  },
})
on(updateProfile.fulfilled, 'Your details have been saved')
on(verifyEmail.fulfilled, 'Your email address is verified')

on(removeItem, (action) => ({ message: `${action.payload.title} was removed from your bag`, severity: 'info' }))

on(toggleWishlist.fulfilled, (action) => (action.meta.arg.save ? 'Saved to your wishlist' : 'Removed from your wishlist'))
on(toggleWishlist.rejected, onError)

on(submitReview.fulfilled, 'Thank you — your review has been published')

on(createProduct.fulfilled, (action) => `${action.payload.title} was added to the catalogue`)
on(updateProduct.fulfilled, (action) => `${action.payload.title} was updated`)
on(updateStock.fulfilled, (action) =>
  action.payload.length === 1 ? `Stock saved for ${action.payload[0].title}` : `Stock saved for ${action.payload.length} products`,
)
on(updateStock.rejected, onError)

on(createUser.fulfilled, (action) =>
  action.payload.verificationEmailSent === false
    ? { message: `${action.payload.name} was added, but the verification email could not be sent`, severity: 'info' }
    : `${action.payload.name} was added as ${action.payload.role}`,
)
on(updateUserRole.fulfilled, (action) => `${action.payload.name} is now ${action.payload.role}`)
on(updateUserRole.rejected, onError)

on(deleteProduct.fulfilled, { message: 'The product was deleted', severity: 'info' })
on(deleteProduct.rejected, onError)

on(updateOrderStatus.fulfilled, (action) => `Order marked as ${action.payload.status}`)
on(updateOrderStatus.rejected, onError)
on(updateProfile.rejected, onError)
