import {
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Rating,
  Typography,
} from '@mui/material'
import { useEffect } from 'react'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import AddShoppingCartRoundedIcon from '@mui/icons-material/AddShoppingCartRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import { useDispatch, useSelector } from 'react-redux'
import { addItem, removeItem } from '../toolkit/slice'
import {fetchproduct} from '../toolkit/productslice'
function Product() {
  const dispatch = useDispatch()
  const { items: products, status, error } = useSelector((state) => state.products)

  const cartitemselector = useSelector((state) => state.cart.items)

  useEffect(() => {
    dispatch(fetchproduct())
  }, [dispatch])

  return (
    <section className="product-section" id="collection" aria-labelledby="collection-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CURATED FOR YOU</span>
          <Typography component="h2" id="collection-title" className="section-title">
            Everyday favourites
          </Typography>
        </div>
        <Button className="view-all-button" endIcon={<span aria-hidden="true">↗</span>}>
          View all
        </Button>
      </div>

      <div className="category-row" aria-label="Product categories">
        <Button className="category-chip category-chip-active">All things</Button>
        <Button className="category-chip">Home</Button>
        <Button className="category-chip">Bath &amp; body</Button>
        <Button className="category-chip">Accessories</Button>
      </div>

      {status === 'loading' && <p role="status">Loading products…</p>}
      {status === 'failed' && <p role="alert">Could not load products: {error}</p>}
      {status === 'succeeded' && products.length === 0 && <p>No products found.</p>}

      <div className="product-grid">
        {products.map((product) => (
          <Card className="product-card" elevation={0} key={product.id}>
            <div className={`product-image-wrap product-image-${product.color}`}>
              <CardMedia
                component="img"
                image={product.thumbnail}
                alt={product.title}
                className="product-image"
              />
              {product.label && (
                <Chip label={product.label} size="small" className="product-label" />
              )}
              <IconButton aria-label={`Add ${product.name} to wishlist`} className="favorite-button">
                <FavoriteBorderRoundedIcon />
              </IconButton>
            </div>
            <CardContent className="product-card-content">
              <Typography component="p" className="product-category">
                {product.category}
              </Typography>
              <div className="product-name-price">
                <Typography component="h3" className="product-name">
                  {product.title}
                </Typography>
                <span className="product-price">${product.price.toFixed(2)}</span>
              </div>
              <div className="product-rating">
                <Rating value={product.rating} precision={0.1} readOnly size="small" />
                <span>{product.rating} ({product.reviews.length})</span>
              </div>

              {
                cartitemselector.find((cartitem)=>cartitem.id === product.id)?
                <Button
                  onClick={() => dispatch(removeItem(product))}
                  variant="outlined"
                  fullWidth
                  startIcon={<DeleteOutlineRoundedIcon />}
                  className="remove-button"
                  aria-label={`Remove ${product.title} from cart`}
                >
                  Remove from cart
                </Button> :
                <Button
                  onClick={() => dispatch(addItem(product))}
                  variant="outlined"
                  fullWidth
                  startIcon={<AddShoppingCartRoundedIcon />}
                  className="add-button"
                >
                  Add to bag
                </Button>
              }
              {/* <Button
                onClick={() => dispatch(addItem(product))}
                variant="outlined"
                fullWidth
                startIcon={<AddShoppingCartRoundedIcon />}
                className="add-button"
              >
                Add to bag
              </Button> */}

              
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

export default Product
