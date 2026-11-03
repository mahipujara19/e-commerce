import { useMemo } from 'react'
import { Alert } from '@mui/material'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { fetchWishlist } from '../toolkit/wishlistSlice'
import EmptyState from './EmptyState'
import ProductCard, { ProductCardSkeleton } from './ProductCard'

function Wishlist() {
  const dispatch = useDispatch()
  const { ids, status } = useSelector((state) => state.wishlist)
  const { items: products, status: productStatus } = useSelector((state) => state.products)

  // Keep the order in which pieces were saved, most recent first.
  const saved = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]))
    return ids.map((id) => byId.get(id)).filter(Boolean).reverse()
  }, [ids, products])

  const loading = ((status === 'idle' || status === 'loading') && ids.length === 0) || productStatus === 'loading' || productStatus === 'idle'

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">Saved for later</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Wishlist</h1>
        </div>
        {!loading && saved.length > 0 && (
          <p className="text-sm text-stone">{saved.length} {saved.length === 1 ? 'piece' : 'pieces'}</p>
        )}
      </header>

      {status === 'failed' && (
        <Alert
          severity="error"
          className="mt-10"
          action={
            <button type="button" onClick={() => dispatch(fetchWishlist())} className="px-3 text-sm font-semibold underline">
              Retry
            </button>
          }
        >
          We couldn&apos;t load your wishlist.
        </Alert>
      )}

      {loading ? (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={index} />)}
        </div>
      ) : saved.length === 0 ? (
        status !== 'failed' && (
          <EmptyState
            icon={FavoriteBorderRoundedIcon}
            title="Nothing saved yet"
            description="Tap the heart on any piece to keep it here while you decide."
            action={<Link to="/shop" className="btn-primary">Discover the collection</Link>}
          />
        )
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
          {saved.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

export default Wishlist
