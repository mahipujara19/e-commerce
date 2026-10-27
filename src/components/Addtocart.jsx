import {
  Button,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { changeQuantity, clearItem, removeItem } from '../toolkit/slice'

const freeShippingMinimum = 75

function Addtocart() {
  const cartItems = useSelector((state) => state.cart.items)
  const dispatch = useDispatch()
  const itemCount = cartItems.reduce((total, item) => total + (item.quantity ?? 1), 0)
  const subtotal = cartItems.reduce((total, item) => total + item.price * (item.quantity ?? 1), 0)
  const shippingProgress = Math.min((subtotal / freeShippingMinimum) * 100, 100)
  const remainingForFreeShipping = Math.max(freeShippingMinimum - subtotal, 0)

  return (
    <aside className="cart-panel" aria-labelledby="cart-title">
      <div className="cart-heading">
        <div>
          <span className="eyebrow">YOUR GOOD THINGS</span>
          <Typography component="h2" id="cart-title" className="cart-title">
            Your bag <span>({itemCount})</span>
          </Typography>
        </div>
        {itemCount > 0 && (
          <IconButton
            aria-label="Clear cart"
            className="cart-more-button"
            onClick={() => dispatch(clearItem())}
          >
            <DeleteOutlineRoundedIcon />
          </IconButton>
        )}
      </div>

      <div className="shipping-progress">
        <div className="shipping-message">
          <LocalShippingOutlinedIcon />
          <span>
            {remainingForFreeShipping > 0 ? (
              <>You&apos;re <strong>${remainingForFreeShipping.toFixed(2)}</strong> away from free shipping</>
            ) : (
              <strong>You unlocked free shipping!</strong>
            )}
          </span>
        </div>
        <LinearProgress
          variant="determinate"
          value={shippingProgress}
          className="shipping-progress-bar"
          aria-label="Progress toward free shipping"
        />
      </div>

      {itemCount > 0 ? (
        <>
          <Stack className="cart-items" divider={<Divider flexItem />}>
            {cartItems.map((item) => (
              <div className="cart-item" key={item.id}>
                <img
                  className="cart-item-image"
                  src={item.thumbnail}
                  alt={item.title}
                />
                <div className="cart-item-info">
                  <div className="cart-item-title-row">
                    <Typography component="h3" className="cart-item-name">
                      {item.title}
                    </Typography>
                    <span className="cart-item-price">
                      ${(item.price * (item.quantity ?? 1)).toFixed(2)}
                    </span>
                  </div>
                  <span className="cart-item-detail">{item.brand || item.category}</span>
                  <div className="quantity-control" aria-label={`Quantity: ${item.quantity ?? 1}`}>
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
                  <Button
                    className="cart-item-remove"
                    onClick={() => dispatch(removeItem(item))}
                    aria-label={`Remove ${item.title} from cart`}
                    startIcon={<DeleteOutlineRoundedIcon />}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </Stack>

          <Divider className="cart-divider" />

          <div className="subtotal-row">
            <span>Subtotal</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>
          <p className="tax-note">Taxes and shipping calculated at checkout.</p>
          <Button
            component={Link}
            to="/cart"
            variant="contained"
            fullWidth
            className="checkout-button"
            endIcon={<span aria-hidden="true">→</span>}
          >
            Review your bag
          </Button>
          <div className="secure-checkout">
            <ShoppingBagOutlinedIcon />
            <span>Thoughtful things, ready when you are</span>
          </div>
        </>
      ) : (
        <div className="cart-empty">
          <ShoppingBagOutlinedIcon />
          <Typography component="p">Your bag is empty for now.</Typography>
          <Typography component="p" className="cart-empty-hint">
            Find a little something you love.
          </Typography>
        </div>
      )}
    </aside>
  )
}

export default Addtocart
