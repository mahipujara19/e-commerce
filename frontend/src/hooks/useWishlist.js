import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { notify } from '../toolkit/toastSlice'
import { toggleWishlist } from '../toolkit/wishlistSlice'

// The wishlist lives on the account, so guests are asked to sign in and returned to the same page.
function useWishlist(productId) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const saved = useSelector((state) => state.wishlist.ids.includes(productId))

  const toggle = () => {
    if (!isAuthenticated) {
      dispatch(notify({ message: 'Sign in to save pieces to your wishlist', severity: 'info' }))
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    dispatch(toggleWishlist({ productId, save: !saved }))
  }

  return { saved, toggle }
}

export default useWishlist
