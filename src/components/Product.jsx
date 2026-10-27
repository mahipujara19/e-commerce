import { useEffect, useMemo } from 'react'
import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Rating,
  Typography,
} from '@mui/material'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { fetchproduct } from '../toolkit/productslice'
import { setCategory } from '../toolkit/searchSlice'

/**
 * Product listing component.
 *
 * Reads searchQuery and category from the Redux search slice, then filters
 * the product list so the user sees only matching items.
 *
 * Category chips are generated dynamically from the fetched products
 * (so they always reflect the categories the API returns).
 *
 * Search matches against title, category, brand, and description (case-insensitive).
 */
function Product() {
  const dispatch = useDispatch()
  const { items: products, status, error } = useSelector((state) => state.products)

  // Read search and filter state from Redux
  const searchQuery = useSelector((state) => state.search.query)
  const activeCategory = useSelector((state) => state.search.category)

  // Fetch products from the API on first render
  useEffect(() => {
    dispatch(fetchproduct())
  }, [dispatch])

  // Build a unique, sorted list of categories from the products for the filter chips
  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))]
    cats.sort()
    return cats
  }, [products])

  /**
   * Filter products by both search query AND active category.
   * - Category filter: if a category is selected, only show products in that category
   * - Search filter: match against title, category, brand, and description (case-insensitive)
   * - Both filters stack — the user can search within a category
   */
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return products.filter((product) => {
      // Category filter: skip products that don't match the selected category
      if (activeCategory && product.category !== activeCategory) return false

      // Search filter: check if query appears in any searchable field
      if (query) {
        const searchable = [
          product.title,
          product.category,
          product.brand,
          product.description,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!searchable.includes(query)) return false
      }

      return true
    })
  }, [products, searchQuery, activeCategory])

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

      {/*
       * Category filter chips — dynamically generated from fetched product categories.
       * Clicking a chip dispatches setCategory to the Redux store.
       * "All things" resets the filter (empty string) to show every product.
       * The active chip gets highlighted styling via category-chip-active class.
       */}
      <div className="category-row" aria-label="Product categories">
        <Button
          className={`category-chip ${activeCategory === '' ? 'category-chip-active' : ''}`}
          onClick={() => dispatch(setCategory(''))}
        >
          All things
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            className={`category-chip ${activeCategory === cat ? 'category-chip-active' : ''}`}
            onClick={() => dispatch(setCategory(cat))}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Loading and error states */}
      {status === 'loading' && <p role="status">Loading products…</p>}
      {status === 'failed' && <p role="alert">Could not load products: {error}</p>}

      {/* Empty state — shown when search/filter returns no results */}
      {status === 'succeeded' && filteredProducts.length === 0 && (
        <div className="no-results">
          <Typography className="no-results-text">
            No products found{searchQuery ? ` for "${searchQuery}"` : ''}{activeCategory ? ` in ${activeCategory}` : ''}.
          </Typography>
          <Button
            onClick={() => dispatch(setCategory(''))}
            className="no-results-btn"
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* Product grid — displays filtered products as cards */}
      <div className="product-grid">
        {filteredProducts.map((product) => (
          <Card className="product-card" elevation={0} key={product.id}>
            <div className={`product-image-wrap product-image-${product.color}`}>
              {/* Clickable image area — navigates to product detail page */}
              <CardActionArea
                component={Link}
                to={`/productitem/${product.id}`}
                aria-label={`View ${product.title}`}
                className="product-card-link"
              >
                <CardMedia
                  component="img"
                  image={product.thumbnail}
                  alt={product.title}
                  className="product-image"
                />
              </CardActionArea>
              {/* Optional product label badge (e.g. "New", "Sale") */}
              {product.label && (
                <Chip label={product.label} size="small" className="product-label" />
              )}
              {/* Wishlist button */}
              {/* <IconButton aria-label={`Add ${product.title} to wishlist`} className="favorite-button">
                <FavoriteBorderRoundedIcon />
              </IconButton> */}
            </div>
            <CardContent className="product-card-content">
              {/* Clickable info area — also navigates to product detail */}
              <CardActionArea
                component={Link}
                to={`/productitem/${product.id}`}
                className="product-info-link"
              >
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
              </CardActionArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

export default Product
