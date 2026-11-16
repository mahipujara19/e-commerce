import { useId } from 'react'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useProductSummary } from '../hooks/useProducts'
import { setCategory, setSearchQuery } from '../toolkit/searchSlice'
import { formatCategory } from '../utils/format'
import SearchSuggestions from './SearchSuggestions'

/**
 * The header search bar: "search in" category, the text box with live suggestions, and a search button.
 * The category is the shop's own category filter (search slice), so searching lands on the shop already
 * filtered, and suggestions are limited to it.
 *
 * The category picker is a real <select> laid transparently over its label: the label sizes to the chosen
 * category (as short as "All"), while keyboard, screen readers and phones get the native control.
 */
function HeaderSearch({ className = '' }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const inputId = useId()
  const categoryId = useId()
  const query = useSelector((state) => state.search.query)
  const category = useSelector((state) => state.search.category)
  const { data: summary } = useProductSummary()
  const categories = (summary?.categories ?? []).map((item) => item.name)

  const searchShop = (text) => {
    dispatch(setSearchQuery(text))
    navigate('/shop')
  }

  const pickSuggestion = ({ type, value }) => {
    if (type === 'product') {
      navigate(`/productitem/${value.id}`)
    } else if (type === 'category') {
      dispatch(setSearchQuery(''))
      dispatch(setCategory(value))
      navigate('/shop')
    } else {
      dispatch(setSearchQuery(value))
      navigate('/shop')
    }
  }

  return (
    <form
      role="search"
      aria-label="Search the collection"
      onSubmit={(event) => {
        event.preventDefault()
        searchShop(query.trim())
      }}
      className={`relative flex h-11 w-full items-stretch bg-surface ring-1 ring-line transition-shadow focus-within:ring-2 focus-within:ring-gold ${className}`}
    >
      <div className="relative flex max-w-[6.5rem] shrink-0 items-center gap-1 border-r border-line bg-sand px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink transition-colors focus-within:bg-gold-soft hover:bg-gold-soft sm:max-w-[11rem] sm:px-3">
        <span className="truncate" aria-hidden="true">{category ? formatCategory(category) : 'All'}</span>
        <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} className="shrink-0 text-stone" aria-hidden="true" />
        <label htmlFor={categoryId} className="sr-only">Search in category</label>
        <select
          id={categoryId}
          value={category}
          onChange={(event) => dispatch(setCategory(event.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          <option value="">All categories</option>
          {categories.map((name) => (
            <option key={name} value={name}>{formatCategory(name)}</option>
          ))}
        </select>
      </div>

      <label htmlFor={inputId} className="sr-only">Search the collection</label>
      <SearchSuggestions
        inputId={inputId}
        rootClassName="flex min-w-0 flex-1"
        value={query}
        category={category}
        onChange={(text) => dispatch(setSearchQuery(text))}
        onSubmit={searchShop}
        onPick={pickSuggestion}
        placeholder="Search watches, fragrance, jewellery…"
        inputClassName="h-full w-full min-w-0 bg-transparent px-3 text-sm outline-none placeholder:text-stone/70"
      />

      <button
        type="submit"
        aria-label="Search"
        className="grid w-12 shrink-0 place-items-center bg-ink text-ivory transition-colors hover:bg-gold focus-visible:bg-gold"
      >
        <SearchRoundedIcon sx={{ fontSize: 22 }} />
      </button>
    </form>
  )
}

export default HeaderSearch
