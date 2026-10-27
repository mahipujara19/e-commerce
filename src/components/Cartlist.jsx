import {
  Alert,
  Button,
  Card,
  CardContent,
  CardMedia,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { changeQuantity, removeItem } from '../toolkit/slice'

/**
 * Cartlist — Full-page cart review.
 *
 * The "Proceed to checkout" button adapts based on auth state:
 * - Logged in → goes straight to /checkout
 * - Not logged in → goes to /login with return path to /checkout
 * This enforces the flow: Browse → Cart → Login/Signup → Checkout
 */
function Cartlist() {
  const cartItems = useSelector((state) => state.cart.items)
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

  if (cartItems.length === 0) {
    return (
      <Card className="cart-list-empty" elevation={0}>
        <CardContent>
          <div className="cart-empty-icon">
            <ShoppingBagOutlinedIcon />
          </div>
          <Typography component="h2" className="cart-list-title">
            Your bag is taking a little break
          </Typography>
          <Typography className="cart-empty-copy">
            Find something lovely to bring home.
          </Typography>
          <Button
            component={Link}
            to="/"
            variant="contained"
            className="cart-continue-button"
          >
            Continue shopping
          </Button>
        </CardContent>
      </Card>
    )
  }

  const itemCount = cartItems.reduce((total, item) => total + (item.quantity ?? 1), 0)
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * (item.quantity ?? 1),
    0,
  )

  return (
    <section className="cart-list-page" aria-labelledby="cart-list-heading">
      <div className="cart-list-header">
        <div>
          <span className="eyebrow">YOUR GOOD THINGS</span>
          <Typography component="h1" id="cart-list-heading" className="cart-list-title">
            Shopping bag
          </Typography>
        </div>
        <Typography className="cart-list-count">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </Typography>
      </div>

      <Stack className="cart-list-items" divider={<Divider flexItem />}>
        {cartItems.map((item) => (
          <Card className="cart-list-item" elevation={0} key={item.id}>
            <CardMedia
              component="img"
              image={item.thumbnail}
              alt={item.title}
              className="cart-list-image"
            />
            <CardContent className="cart-list-item-content">
              <div className="cart-list-item-main">
                <div>
                  <Typography component="p" className="cart-list-category">
                    {item.category}
                  </Typography>
                  <Typography component="h2" className="cart-list-item-title">
                    {item.title}
                  </Typography>
                  {item.brand && (
                    <Typography className="cart-list-brand">{item.brand}</Typography>
                  )}
                </div>
                <Typography className="cart-list-price">
                  ${(item.price * (item.quantity ?? 1)).toFixed(2)}
                </Typography>
              </div>
              <div className="cart-list-item-actions">
                <Button
                  onClick={() => dispatch(removeItem(item))}
                  startIcon={<DeleteOutlineRoundedIcon />}
                  className="cart-list-remove"
                  aria-label={`Remove ${item.title} from cart`}
                >
                  Remove
                </Button>
                <div className="quantity-control cart-list-quantity" aria-label={`Quantity: ${item.quantity ?? 1}`}>
                  <IconButton
                    aria-label={`Decrease ${item.title} quantity`}
                    size="small"
                    onClick={() => dispatch(changeQuantity({ id: item.id, change: -1 }))}
                  >
                    <RemoveRoundedIcon />
                  </IconButton>
                  <span>{item.quantity ?? 1}</span>
                  <IconButton
                    aria-label={`Increase ${item.title} quantity`}
                    size="small"
                    onClick={() => dispatch(changeQuantity({ id: item.id, change: 1 }))}
                  >
                    <AddRoundedIcon />
                  </IconButton>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Order summary with subtotal and action buttons */}
      <div className="cart-list-summary">
        <div className="cart-list-subtotal">
          <Typography>Subtotal</Typography>
          <Typography>${subtotal.toFixed(2)}</Typography>
        </div>
        <Typography className="cart-list-shipping-note">
          Shipping and taxes are calculated at checkout.
        </Typography>
        {/*
         * Checkout button — adapts based on auth state:
         * - Logged in → /checkout directly
         * - Not logged in → /login with redirect back to /checkout after auth
         */}
        {!isAuthenticated && (
          <Alert severity="info" className="cart-auth-notice" icon={<LockOutlinedIcon fontSize="small" />}>
            Please sign in or create an account to checkout.
          </Alert>
        )}
        <Button
          component={Link}
          to={isAuthenticated ? '/checkout' : '/login'}
          state={!isAuthenticated ? { from: '/checkout' } : undefined}
          variant="contained"
          fullWidth
          className="cart-checkout-btn"
        >
          {isAuthenticated ? 'Proceed to checkout' : 'Sign in to checkout'}
        </Button>
        <Button
          component={Link}
          to="/"
          variant="outlined"
          className="cart-continue-link"
        >
          Continue shopping
        </Button>
      </div>
    </section>
  )
}

export default Cartlist
