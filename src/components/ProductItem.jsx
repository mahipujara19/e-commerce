import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  CardMedia,
  Chip,
  IconButton,
  Rating,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useParams,useNavigate } from 'react-router-dom'
import { addItem } from '../toolkit/slice'
import { fetchproduct } from '../toolkit/productslice'

function ProductItem() {
    const navigate=useNavigate();
  const { id } = useParams()
  const [quantity, setQuantity] = useState(1)
  const dispatch = useDispatch()
  const { items: products, status, error } = useSelector((state) => state.products)
  const cartItems = useSelector((state) => state.cart.items)
  const product = products.find((item) => item.id === Number(id))
  const cartItem = cartItems.find((item) => item.id === Number(id))
  const maxQuantity = product?.stock == null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, product.stock - (cartItem?.quantity ?? 0))

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchproduct())
    }
  }, [dispatch, status])

  if (!product && (status === 'idle' || status === 'loading')) {
    return <Typography role="status" className="product-detail-message">Loading product…</Typography>
  }

  if (!product && status === 'failed') {
    return <Alert severity="error" className="product-detail-message">Could not load product: {error}</Alert>
  }

  if (!product) {
    return (
      <Alert
        severity="warning"
        action={<Button component={Link} to="/">Back to shop</Button>}
        className="product-detail-message"
      >
        This product could not be found.
      </Alert>
    )
  }

  return (
    <section className="product-detail" aria-labelledby="product-detail-title">
      <Button
        component={Link}
        to="/"
        startIcon={<ArrowBackRoundedIcon />}
        className="product-detail-back"
      >
        Back to the collection
      </Button>

      <div className="product-detail-layout">
        <div className="product-detail-image-wrap">
          {product.thumbnail && (
            <CardMedia
              component="img"
              image={product.thumbnail}
              alt={product.title}
              className="product-detail-image"
            />
          )}
        </div>

        <div className="product-detail-copy">
          <span className="eyebrow">{product.category}</span>
          <Typography component="h1" id="product-detail-title" className="product-detail-title">
            {product.title}
          </Typography>
          {product.brand && (
            <Typography className="product-detail-brand">{product.brand}</Typography>
          )}

          <div className="product-detail-rating">
            <Rating value={product.rating} precision={0.1} readOnly size="small" />
            <Typography>{product.rating} · {product.reviews.length} reviews</Typography>
          </div>

          <Typography className="product-detail-price">
            ${product.price.toFixed(2)}
          </Typography>

          <Typography className="product-detail-description">
            {product.description}
          </Typography>

          <Stack direction="row" spacing={1} className="product-detail-chips">
            <Chip label={product.availabilityStatus || 'In stock'} size="small" />
            {product.shippingInformation && (
              <Chip label={product.shippingInformation} size="small" variant="outlined" />
            )}
          </Stack>

          {cartItem && (
            <Typography className="product-detail-cart-status" role="status">
              Already in your bag: {cartItem.quantity ?? 1}
            </Typography>
          )}

          <div className="product-detail-quantity-row">
            <Typography component="span" className="product-detail-quantity-label">
              Quantity to add
            </Typography>
            <div className="quantity-control product-detail-quantity">
              <IconButton
                aria-label="Decrease quantity to add"
                size="small"
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                <RemoveRoundedIcon />
              </IconButton>
              <span aria-live="polite">{quantity}</span>
              <IconButton
                aria-label="Increase quantity to add"
                size="small"
                disabled={quantity >= maxQuantity}
                onClick={() => setQuantity((current) => Math.min(current + 1, maxQuantity))}
              >
                <AddRoundedIcon />
              </IconButton>
            </div>
          </div>

          <Button
            variant="contained"
            fullWidth
            disabled={maxQuantity === 0}
            startIcon={<AddShoppingCartRoundedIcon />}
            className="product-detail-add"
            onClick={() => {
              dispatch(addItem({ ...product, quantity }))
              setQuantity(1)
              navigate("/")
            }}
          >
            {maxQuantity === 0 ? 'Out of stock' : `Add to bag · ${quantity}`}
            
          </Button>
        </div>
      </div>
    </section>
  )
}

export default ProductItem
