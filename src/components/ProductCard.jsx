import { useState } from 'react'
import { Rating } from '@mui/material'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { addItem } from '../toolkit/slice'
import { openCart } from '../toolkit/uiSlice'
import { formatCategory, money, originalPrice } from '../utils/format'

function ProductCard({ product }) {
  const dispatch = useDispatch()
  const [liked, setLiked] = useState(false)
  const inBag = useSelector((state) => state.cart.items.find((item) => item.id === product.id)?.quantity ?? 0)
  const discount = Math.round(product.discountPercentage ?? 0)
  const original = originalPrice(product)
  const soldOut = product.stock != null && inBag >= product.stock
  const productUrl = `/productitem/${product.id}`

  const handleQuickAdd = () => {
    dispatch(addItem({ ...product, quantity: 1 }))
    dispatch(openCart())
  }

  return (
    <article className="group flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        <Link to={productUrl} aria-label={`View ${product.title}`} className="block h-full w-full">
          <img
            src={product.thumbnail}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-contain p-8 transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </Link>

        {discount >= 10 && (
          <span className="absolute left-3 top-3 bg-ink px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ivory">
            −{discount}%
          </span>
        )}

        <button
          type="button"
          onClick={() => setLiked((value) => !value)}
          aria-pressed={liked}
          aria-label={`${liked ? 'Remove' : 'Save'} ${product.title} ${liked ? 'from' : 'to'} wishlist`}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-surface/90 text-ink shadow-sm transition hover:bg-surface"
        >
          {liked ? (
            <FavoriteRoundedIcon sx={{ fontSize: 18 }} className="text-gold" />
          ) : (
            <FavoriteBorderRoundedIcon sx={{ fontSize: 18 }} />
          )}
        </button>

        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={soldOut}
          className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 bg-ink py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ivory transition-all duration-300 hover:bg-gold focus-visible:translate-y-0 focus-visible:opacity-100 disabled:bg-stone lg:translate-y-3 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100"
        >
          <ShoppingBagOutlinedIcon sx={{ fontSize: 16 }} />
          {soldOut ? 'Sold out' : 'Add to bag'}
        </button>
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-[11px] uppercase tracking-[0.18em] text-stone">
          {product.brand || formatCategory(product.category)}
        </p>
        <Link to={productUrl} className="mt-1.5 line-clamp-2 font-display text-[17px] leading-snug transition-colors hover:text-gold">
          {product.title}
        </Link>
        <div className="mt-2 flex items-center gap-1.5">
          <Rating value={product.rating} precision={0.5} readOnly size="small" sx={{ fontSize: 15 }} />
          <span className="text-xs text-stone">({product.reviews?.length ?? 0})</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[15px] font-semibold">{money(product.price)}</span>
          {original && discount >= 10 && (
            <span className="text-sm text-stone line-through">{money(original)}</span>
          )}
        </div>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="aspect-[4/5] bg-sand" />
      <div className="mt-4 h-3 w-1/3 bg-sand" />
      <div className="mt-3 h-4 w-3/4 bg-sand" />
      <div className="mt-3 h-4 w-1/4 bg-sand" />
    </div>
  )
}

export default ProductCard
