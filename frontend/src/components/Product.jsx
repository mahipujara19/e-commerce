import { useEffect, useRef, useState } from 'react'
import { Alert } from '@mui/material'
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded'
import { useDispatch, useSelector } from 'react-redux'
import { PRODUCT_PAGE_SIZE } from '../../../shared/catalog.js'
import useDebouncedValue from '../hooks/useDebouncedValue'
import { useProductList, useProductSummary } from '../hooks/useProducts'
import useQueryParams from '../hooks/useQueryParams'
import { setCategory, setSearchQuery } from '../toolkit/searchSlice'
import { formatCategory, FREE_SHIPPING_TEXT } from '../utils/format'
import EmptyState from './EmptyState'
import Pagination from './Pagination'
import ProductCard, { ProductCardSkeleton } from './ProductCard'
import SectionHeading from './SectionHeading'
import usePageMeta from '../hooks/usePageMeta'

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'discount', label: 'Biggest savings' },
]

// Search, category and sort are applied by the server; only one page of products is ever loaded.
// The page and sort live in the URL (?page=2&sort=rating) so a reload or a shared link shows the same page.
function Product() {
  usePageMeta({ title: 'Shop all pieces', description: `Browse jewellery, watches, fragrance, bags and objects for the home. ${FREE_SHIPPING_TEXT} and 30-day returns.` })
  const dispatch = useDispatch()
  const searchQuery = useSelector((state) => state.search.query)
  const activeCategory = useSelector((state) => state.search.category)
  const [params, setParams] = useQueryParams()
  const sort = SORT_OPTIONS.some((option) => option.value === params.get('sort')) ? params.get('sort') : 'featured'
  const urlPage = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  // The header search updates the query on every key press; the request waits until typing pauses.
  const search = useDebouncedValue(searchQuery.trim(), 300)

  // A new search, category or sort starts again from page 1; a page number in a shared link is kept on load.
  // Page 1 applies in the same render the filters change (derived state), so the old page number is never requested
  // with the new filters; the URL is brought into line just after.
  const filterKey = `${search}|${activeCategory}|${sort}`
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey)
  const [backToFirst, setBackToFirst] = useState(false)
  if (seenFilterKey !== filterKey) {
    setSeenFilterKey(filterKey)
    setBackToFirst(urlPage !== 1)
  }
  if (backToFirst && urlPage === 1) setBackToFirst(false)
  const page = backToFirst ? 1 : urlPage
  useEffect(() => {
    if (backToFirst) setParams({ page: null })
  }, [backToFirst, setParams])

  const { products, total, totalPages, loading, placeholder, error, refetch } = useProductList({
    page,
    pageSize: PRODUCT_PAGE_SIZE,
    sort,
    category: activeCategory,
    search,
  })
  const { data: summary } = useProductSummary()
  const categories = (summary?.categories ?? []).map((category) => category.name)

  // A page past the end (an old link, or products removed since) steps back to the last page.
  useEffect(() => {
    if (!loading && !error && page > totalPages) setParams({ page: totalPages > 1 ? totalPages : null })
  }, [loading, error, page, totalPages, setParams])

  const gridRef = useRef(null)
  const goToPage = (next) => {
    setParams({ page: next > 1 ? next : null })
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gridRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  // Skeletons only on the very first load; changing page keeps the previous page dimmed until the next arrives.
  const initialLoading = loading && products.length === 0
  const firstShown = (Math.min(page, totalPages) - 1) * PRODUCT_PAGE_SIZE + 1

  const chipClass = (active) =>
    `shrink-0 rounded-full border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
      active ? 'border-ink bg-ink text-ivory' : 'border-line bg-surface text-ink hover:border-ink'
    }`

  const clearFilters = () => {
    dispatch(setCategory(''))
    dispatch(setSearchQuery(''))
  }

  return (
    <section id="shop" className="scroll-mt-36 pt-10 pb-14 md:pt-14 md:pb-20 lg:pt-16 lg:pb-28" aria-labelledby="shop-title">
      <div className="container-x">
        <SectionHeading
          id="shop-title"
          title="Shop all pieces"
          action={
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-stone" aria-live="polite">
                {initialLoading ? 'Loading…' : `${total} ${total === 1 ? 'piece' : 'pieces'}`}
              </p>
              <label htmlFor="sort" className="sr-only">Sort products</label>
              <select
                id="sort"
                value={sort}
                onChange={(event) => setParams({ sort: event.target.value === 'featured' ? null : event.target.value })}
                className="h-11 cursor-pointer border border-line bg-surface px-4 pr-8 text-sm outline-none focus:border-ink"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          }
        />

        {/* Phones: one labelled dropdown instead of a long sideways-scrolling row of chips. */}
        <div className="mt-8 sm:hidden">
          <label htmlFor="category-filter" className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">
            Category
          </label>
          <select
            id="category-filter"
            value={activeCategory}
            onChange={(event) => dispatch(setCategory(event.target.value))}
            className="h-12 w-full cursor-pointer border border-line bg-surface px-4 text-sm outline-none focus:border-ink"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>{formatCategory(category)}</option>
            ))}
          </select>
        </div>

        <div className="mt-10 hidden flex-wrap gap-2 sm:flex" role="group" aria-label="Filter by category">
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
            <span className="min-w-0 break-words text-stone">
              Results for <strong className="text-ink">“{searchQuery}”</strong>
            </span>
            <button type="button" onClick={() => dispatch(setSearchQuery(''))} className="text-[11px] font-semibold uppercase tracking-[0.16em] underline underline-offset-4 hover:text-gold">
              Clear search
            </button>
          </div>
        )}

        {error && (
          <Alert
            severity="error"
            className="mt-10"
            action={
              <button type="button" onClick={refetch} className="px-3 text-sm font-semibold underline">
                Retry
              </button>
            }
          >
            We couldn&apos;t load the collection: {error}
          </Alert>
        )}

        {!loading && !error && total === 0 && (
          <div className="mt-12 bg-surface ring-1 ring-line">
            <EmptyState
              compact
              icon={SearchOffRoundedIcon}
              title="Nothing found"
              description={`No pieces match${search ? ` “${search}”` : ''}${activeCategory ? ` in ${formatCategory(activeCategory)}` : ''}.`}
              action={
                <button type="button" onClick={clearFilters} className="btn-outline">
                  Clear all filters
                </button>
              }
            />
          </div>
        )}

        <div
          ref={gridRef}
          className={`mt-10 grid scroll-mt-36 grid-cols-2 gap-x-4 gap-y-12 transition-opacity sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4 ${placeholder ? 'opacity-50' : ''}`}
          aria-busy={loading}
        >
          {initialLoading
            ? Array.from({ length: 8 }, (_, index) => <ProductCardSkeleton key={index} />)
            : products.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
        </div>

        {!initialLoading && total > 0 && (
          <div className="mt-16 flex flex-col items-center gap-5">
            <p className="text-sm text-stone" aria-live="polite">
              Showing {firstShown}–{Math.min(firstShown + PRODUCT_PAGE_SIZE - 1, total)} of {total}
            </p>
            <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onChange={goToPage} label="Shop pages" />
          </div>
        )}
      </div>
    </section>
  )
}

export default Product
