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
            className="h-full w-full object-contain p-5 transition-transform duration-700 ease-out group-hover:scale-105 sm:p-8"
          />
        </Link>

        {discount >= 10 && (
          <span className="absolute left-2.5 top-2.5 bg-ink sm:left-3 sm:top-3 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ivory">
            −{discount}%
          </span>
        )}

        <button
          type="button"
          onClick={() => setLiked((value) => !value)}
          aria-pressed={liked}
          aria-label={`${liked ? 'Remove' : 'Save'} ${product.title} ${liked ? 'from' : 'to'} wishlist`}
          className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-surface/90 text-ink shadow-sm transition hover:bg-surface sm:right-3 sm:top-3"
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
          aria-label={soldOut ? `${product.title} is sold out` : `Add ${product.title} to bag`}
          className="absolute bottom-2.5 right-2.5 grid h-10 w-10 place-items-center rounded-full bg-ink text-ivory shadow-lg transition-all duration-300 hover:bg-gold disabled:bg-stone sm:bottom-3 sm:right-3 lg:inset-x-3 lg:bottom-3 lg:flex lg:h-auto lg:w-auto lg:translate-y-3 lg:items-center lg:justify-center lg:gap-2 lg:rounded-none lg:py-3 lg:opacity-0 lg:shadow-none lg:focus-visible:translate-y-0 lg:focus-visible:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:opacity-100"
        >
          <ShoppingBagOutlinedIcon sx={{ fontSize: 17 }} />
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] lg:inline">
            {soldOut ? 'Sold out' : 'Add to bag'}
          </span>
        </button>
      </div>

      <div className="mt-3 flex flex-1 flex-col sm:mt-4">
        <p className="truncate text-[10px] uppercase tracking-[0.16em] text-stone sm:text-[11px] sm:tracking-[0.18em]">
          {product.brand || formatCategory(product.category)}
        </p>
        <Link to={productUrl} className="mt-1 line-clamp-2 font-display text-[15px] leading-snug transition-colors hover:text-gold sm:mt-1.5 sm:text-[17px]">
          {product.title}
        </Link>
        <div className="mt-2 flex items-center gap-1.5">
          <Rating value={product.rating} precision={0.5} readOnly size="small" sx={{ fontSize: 15 }} />
          <span className="text-xs text-stone">({product.reviews?.length ?? 0})</span>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold sm:text-[15px]">{money(product.price)}</span>
          {original && discount >= 10 && (
            <span className="text-xs text-stone line-through sm:text-sm">{money(original)}</span>
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
