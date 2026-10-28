import { useMemo, useState } from 'react'
import { Alert } from '@mui/material'
import { useDispatch, useSelector } from 'react-redux'
import { fetchproduct } from '../toolkit/productslice'
import { setCategory, setSearchQuery } from '../toolkit/searchSlice'
import { featuredRank, formatCategory } from '../utils/format'
import ProductCard, { ProductCardSkeleton } from './ProductCard'
import SectionHeading from './SectionHeading'

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'discount', label: 'Biggest savings' },
]

const SORTERS = {
  featured: (a, b) => featuredRank(a) - featuredRank(b) || b.rating - a.rating,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating,
  discount: (a, b) => b.discountPercentage - a.discountPercentage,
}

const PAGE_SIZE = 12

function Product() {
  const dispatch = useDispatch()
  const { items: products, status, error } = useSelector((state) => state.products)
  const searchQuery = useSelector((state) => state.search.query)
  const activeCategory = useSelector((state) => state.search.category)
  const [sort, setSort] = useState('featured')

  const filterKey = `${searchQuery}|${activeCategory}|${sort}`
  const [page, setPage] = useState({ key: filterKey, count: PAGE_SIZE })
  const visibleCount = page.key === filterKey ? page.count : PAGE_SIZE

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products])

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    const matches = products.filter((product) => {
      if (activeCategory && product.category !== activeCategory) return false
      if (!query) return true
      return [product.title, product.category, product.brand].filter(Boolean).join(' ').toLowerCase().includes(query)
    })
    return [...matches].sort(SORTERS[sort])
  }, [products, searchQuery, activeCategory, sort])

  const visibleProducts = filteredProducts.slice(0, visibleCount)
  const loading = status === 'idle' || status === 'loading'

  const chipClass = (active) =>
    `shrink-0 rounded-full border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
      active ? 'border-ink bg-ink text-ivory' : 'border-line bg-surface text-ink hover:border-ink'
    }`

  const clearFilters = () => {
    dispatch(setCategory(''))
    dispatch(setSearchQuery(''))
  }

  return (
    <section id="shop" className="scroll-mt-24 py-14 md:py-20 lg:py-28" aria-labelledby="shop-title">
      <div className="container-x">
        <SectionHeading
          id="shop-title"
          eyebrow="The collection"
          title="Shop all pieces"
          action={
            <div className="flex items-center gap-4">
              <p className="text-sm text-stone" aria-live="polite">
                {loading ? 'Loading…' : `${filteredProducts.length} pieces`}
              </p>
              <label htmlFor="sort" className="sr-only">Sort products</label>
              <select
                id="sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="h-11 cursor-pointer border border-line bg-surface px-4 pr-8 text-sm outline-none focus:border-ink"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          }
        />

        <div className="-mx-5 mt-10 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filter by category">
          <button type="button" className={chipClass(activeCategory === '')} onClick={() => dispatch(setCategory(''))} aria-pressed={activeCategory === ''}>
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={chipClass(activeCategory === category)}
              onClick={() => dispatch(setCategory(category))}
              aria-pressed={activeCategory === category}
            >
              {formatCategory(category)}
            </button>
          ))}
        </div>

        {searchQuery && (
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-stone">
              Results for <strong className="text-ink">“{searchQuery}”</strong>
            </span>
            <button type="button" onClick={() => dispatch(setSearchQuery(''))} className="text-[11px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4 hover:text-gold">
              Clear search
            </button>
          </div>
        )}

        {status === 'failed' && (
          <Alert
            severity="error"
            className="mt-10"
            action={
              <button type="button" onClick={() => dispatch(fetchproduct())} className="px-3 text-sm font-semibold underline">
                Retry
              </button>
            }
          >
            We couldn&apos;t load the collection: {error}
          </Alert>
        )}

        {status === 'succeeded' && filteredProducts.length === 0 && (
          <div className="mt-12 bg-surface px-6 py-20 text-center ring-1 ring-line">
            <p className="font-display text-3xl">Nothing found</p>
            <p className="mt-3 text-stone">
              No pieces match{searchQuery ? ` “${searchQuery}”` : ''}
              {activeCategory ? ` in ${formatCategory(activeCategory)}` : ''}.
            </p>
            <button type="button" onClick={clearFilters} className="btn-outline mt-8">
              Clear all filters
            </button>
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }, (_, index) => <ProductCardSkeleton key={index} />)
            : visibleProducts.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>

        {visibleCount < filteredProducts.length && (
          <div className="mt-16 flex flex-col items-center gap-5">
            <p className="text-sm text-stone">
              Showing {visibleProducts.length} of {filteredProducts.length}
            </p>
            <div className="h-px w-48 bg-line">
              <div className="h-px bg-ink" style={{ width: `${(visibleProducts.length / filteredProducts.length) * 100}%` }} />
            </div>
            <button type="button" onClick={() => setPage({ key: filterKey, count: visibleCount + PAGE_SIZE })} className="btn-outline">
              Load more
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default Product
