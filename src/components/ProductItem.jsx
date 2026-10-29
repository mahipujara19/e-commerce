import { useMemo, useState } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Alert, Rating } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'
import { addItem } from '../toolkit/slice'
import { fetchproduct } from '../toolkit/productslice'
import { openCart } from '../toolkit/uiSlice'
import { formatCategory, money, originalPrice } from '../utils/format'
import ProductCard from './ProductCard'
import QuantityControl from './QuantityControl'
import SectionHeading from './SectionHeading'

const accordionSx = {
  bgcolor: 'transparent',
  borderBottom: '1px solid rgb(var(--line))',
  '&::before': { display: 'none' },
}

function ProductItem({ id }) {
  const dispatch = useDispatch()
  const [quantity, setQuantity] = useState(1)
  const [imageIndex, setImageIndex] = useState(0)
  const [liked, setLiked] = useState(false)
  const { items: products, status, error } = useSelector((state) => state.products)
  const cartItems = useSelector((state) => state.cart.items)
  const product = products.find((item) => item.id === id)
  const cartItem = cartItems.find((item) => item.id === id)

  const related = useMemo(
    () => (product ? products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4) : []),
    [products, product],
  )

  if (!product && (status === 'idle' || status === 'loading')) {
    return (
      <div className="container-x grid animate-pulse gap-12 py-12 lg:grid-cols-2" role="status" aria-label="Loading product">
        <div className="aspect-square bg-sand" />
        <div className="space-y-5 pt-6">
          <div className="h-3 w-24 bg-sand" />
          <div className="h-10 w-3/4 bg-sand" />
          <div className="h-8 w-32 bg-sand" />
          <div className="h-24 w-full bg-sand" />
        </div>
      </div>
    )
  }

  if (!product && status === 'failed') {
    return (
      <div className="container-x py-20">
        <Alert
          severity="error"
          action={
            <button type="button" onClick={() => dispatch(fetchproduct())} className="px-3 text-sm font-semibold underline">
              Retry
            </button>
          }
        >
          Could not load this piece: {error}
        </Alert>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container-x py-28 text-center">
        <h1 className="font-display text-4xl">This piece could not be found</h1>
        <Link to="/" className="btn-primary mt-10">Back to the collection</Link>
      </div>
    )
  }

  const images = product.images?.length ? product.images : [product.thumbnail]
  const activeIndex = Math.min(imageIndex, images.length - 1)
  const discount = Math.round(product.discountPercentage ?? 0)
  const original = originalPrice(product)
  const inStock = product.stock == null || product.stock > 0
  const maxQuantity = product.stock == null ? Number.POSITIVE_INFINITY : Math.max(0, product.stock - (cartItem?.quantity ?? 0))

  const handleAdd = () => {
    dispatch(addItem({ ...product, quantity }))
    setQuantity(1)
    dispatch(openCart())
  }

  const perks = [
    { icon: LocalShippingOutlinedIcon, label: product.shippingInformation || 'Ships within 2–3 days' },
    { icon: VerifiedOutlinedIcon, label: product.warrantyInformation || 'Authenticity guaranteed' },
    { icon: AutorenewRoundedIcon, label: product.returnPolicy || '30-day returns' },
  ]

  const details = [
    ['Brand', product.brand],
    ['Category', formatCategory(product.category)],
    ['SKU', product.sku],
    ['Dimensions', product.dimensions && `${product.dimensions.width} × ${product.dimensions.height} × ${product.dimensions.depth} cm`],
    ['Minimum order', product.minimumOrderQuantity],
  ].filter(([, value]) => value)

  return (
    <div className="container-x pb-24 pt-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.16em] text-stone">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link to="/" className="hover:text-ink">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li>{formatCategory(product.category)}</li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="max-w-[220px] truncate text-ink">{product.title}</li>
        </ol>
      </nav>

      <section className="mt-6 grid gap-8 md:mt-8 md:grid-cols-2 md:gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16" aria-labelledby="product-title">
        <div className="md:sticky md:top-28 md:self-start">
          <div className="relative aspect-square overflow-hidden bg-sand">
            <img
              key={images[activeIndex]}
              src={images[activeIndex]}
              alt={product.title}
              className="h-full w-full animate-fade-in object-contain p-10 md:p-16"
            />
            {discount >= 10 && (
              <span className="absolute left-4 top-4 bg-ink px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-ivory">
                −{discount}%
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  aria-label={`Show image ${index + 1}`}
                  aria-current={index === activeIndex}
                  className={`aspect-square bg-sand p-2 ring-1 transition ${index === activeIndex ? 'ring-ink' : 'ring-transparent hover:ring-line'}`}
                >
                  <img src={src} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:pt-4">
          <h1 id="product-title" className="font-display text-[32px] leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {product.title}
          </h1>
          <a href="#reviews" className="mt-5 inline-flex items-center gap-2 text-sm text-stone hover:text-ink">
            <Rating value={product.rating} precision={0.1} readOnly size="small" />
            {product.rating.toFixed(1)} · {product.reviews?.length ?? 0} reviews
          </a>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className="font-display text-4xl">{money(product.price)}</span>
            {original && discount >= 1 && (
              <>
                <span className="text-lg text-stone line-through">{money(original)}</span>
                <span className="bg-gold-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          <p className="mt-6 leading-relaxed text-stone">{product.description}</p>

          <div className="mt-8 flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${inStock ? 'bg-emerald-600' : 'bg-red-600'}`} />
            <span className="font-medium">{product.availabilityStatus || (inStock ? 'In stock' : 'Out of stock')}</span>
            {inStock && product.stock <= 10 && <span className="text-stone">— only {product.stock} left</span>}
          </div>
          {cartItem && (
            <p role="status" className="mt-2 text-sm text-gold">
              Already in your bag: {cartItem.quantity ?? 1}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-2 sm:gap-3">
            <QuantityControl
              value={quantity}
              label={product.title}
              onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
              onIncrease={() => setQuantity((current) => Math.min(current + 1, maxQuantity))}
              canDecrease={quantity > 1}
              canIncrease={quantity < maxQuantity}
            />
            <button type="button" onClick={handleAdd} disabled={maxQuantity === 0} className="btn-primary h-12 min-w-0 flex-1 px-4 sm:px-7 md:order-last md:w-full md:flex-none xl:order-none xl:w-auto xl:flex-1">
              <ShoppingBagOutlinedIcon sx={{ fontSize: 18 }} />
              {maxQuantity === 0 ? (
                inStock ? 'In your bag' : 'Out of stock'
              ) : (
                <span className="truncate">
                  Add to bag<span className="hidden sm:inline"> · {money(product.price * quantity)}</span>
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setLiked((value) => !value)}
              aria-pressed={liked}
              aria-label={liked ? 'Remove from wishlist' : 'Save to wishlist'}
              className="grid h-12 w-12 place-items-center border border-line bg-surface transition hover:border-ink md:ml-auto xl:ml-0"
            >
              {liked ? <FavoriteRoundedIcon sx={{ fontSize: 20 }} className="text-gold" /> : <FavoriteBorderRoundedIcon sx={{ fontSize: 20 }} />}
            </button>
          </div>

          <ul className="mt-10 grid gap-4 border-y border-line py-7 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
            {perks.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3 text-sm">
                <Icon sx={{ fontSize: 20 }} className="mt-0.5 shrink-0 text-gold" />
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-2">
            <Accordion disableGutters elevation={0} square defaultExpanded sx={accordionSx}>
              <AccordionSummary expandIcon={<AddRoundedIcon />} sx={{ px: 0 }}>
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em]">Details</span>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pb: 3 }}>
                <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
                  {details.map(([label, value]) => (
                    <div key={label} className="contents">
                      <dt className="text-stone">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </AccordionDetails>
            </Accordion>
            <Accordion disableGutters elevation={0} square sx={accordionSx}>
              <AccordionSummary expandIcon={<AddRoundedIcon />} sx={{ px: 0 }}>
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em]">Shipping &amp; returns</span>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 0, pb: 3 }}>
                <p className="text-sm leading-relaxed text-stone">
                  Complimentary shipping on orders over $75. Every order is carefully packed with recycled materials.{' '}
                  {product.returnPolicy || '30-day returns'} — simply contact our concierge to arrange a collection.
                </p>
              </AccordionDetails>
            </Accordion>
          </div>
        </div>
      </section>

      {product.reviews?.length > 0 && (
        <section id="reviews" className="mt-16 scroll-mt-28 md:mt-24" aria-labelledby="product-reviews-title">
          <SectionHeading
            id="product-reviews-title"
            title={`${product.rating.toFixed(1)} out of 5`}
            description={`Based on ${product.reviews.length} verified ${product.reviews.length === 1 ? 'review' : 'reviews'}.`}
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {product.reviews.map((review) => (
              <figure key={`${review.reviewerName}-${review.date}`} className="bg-surface p-7 ring-1 ring-line">
                <Rating value={review.rating} readOnly size="small" />
                <blockquote className="mt-4 font-display text-xl leading-snug">“{review.comment}”</blockquote>
                <figcaption className="mt-6 text-sm">
                  <span className="font-semibold">{review.reviewerName}</span>
                  <span className="text-stone"> · {new Date(review.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-16 md:mt-24" aria-labelledby="related-title">
          <SectionHeading id="related-title" title="You may also like" />
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-5 md:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ProductItemPage() {
  const { id } = useParams()
  return <ProductItem key={id} id={Number(id)} />
}

export default ProductItemPage
