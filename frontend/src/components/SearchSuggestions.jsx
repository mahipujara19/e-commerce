import { useEffect, useId, useMemo, useState } from 'react'
import { CircularProgress } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import SellOutlinedIcon from '@mui/icons-material/SellOutlined'
import useDebouncedValue from '../hooks/useDebouncedValue'
import { api } from '../utils/api'
import { formatCategory } from '../utils/format'
import Price from './Price'

const MIN_LENGTH = 2

/**
 * The header search box with server suggestions (GET /api/products/suggestions), as an ARIA 1.2 combobox.
 *
 * - Requests wait until typing pauses; a newer keystroke cancels the request in flight, and any response that is
 *   not for the current text is ignored.
 * - ↑/↓ move through the suggestions, Enter opens the highlighted one (or searches the shop when none is),
 *   Escape closes the list, and a second Escape closes the search panel.
 *
 * onSubmit(text) searches the shop; onPick({ type, value }) handles a suggestion:
 * type 'product' (value = product), 'category' or 'brand' (value = name).
 */
function SearchSuggestions({
  value,
  onChange,
  onSubmit,
  onPick,
  onClose,
  category = '',
  inputId,
  autoFocus = false,
  inputClassName = '',
  // The dropdown is positioned against the nearest positioned ancestor. Leave `relative` out here to let it span a
  // wider container instead (the header search bar spans the category picker, input and button).
  rootClassName = 'relative min-w-0 flex-1',
  placeholder,
}) {
  const listId = useId()
  const term = useDebouncedValue(value.trim(), 200)
  // Responses are keyed by text and category, so a category change never shows the other category's results.
  const requestKey = `${category}|${term}`
  // The answer for one request: { key, data } or { key, error }. Only ever set when a request finishes.
  const [result, setResult] = useState({ key: '', data: null, error: null })
  const [open, setOpen] = useState(autoFocus)
  const [active, setActive] = useState(-1)

  useEffect(() => {
    if (term.length < MIN_LENGTH) return undefined
    const controller = new AbortController()
    const scope = category ? `&category=${encodeURIComponent(category)}` : ''
    api(`/products/suggestions?q=${encodeURIComponent(term)}${scope}`, { signal: controller.signal })
      .then((data) => setResult({ key: requestKey, data, error: null }))
      .catch((error) => {
        if (error.code !== 'ABORTED') setResult({ key: requestKey, data: null, error: error.message })
      })
    return () => controller.abort()
  }, [term, category, requestKey])

  const typed = value.trim()
  const current = result.key === `${category}|${typed}` && typed.length >= MIN_LENGTH ? result : null
  const loading = typed.length >= MIN_LENGTH && !current

  // Flattened in the order they are shown, so arrow keys follow what the eye sees.
  const options = useMemo(() => {
    const data = current?.data
    if (!data) return []
    return [
      ...data.products.map((product) => ({ type: 'product', key: `p-${product.id}`, value: product })),
      ...data.categories.map((name) => ({ type: 'category', key: `c-${name}`, value: name })),
      ...data.brands.map((name) => ({ type: 'brand', key: `b-${name}`, value: name })),
      { type: 'all', key: 'all', value: typed },
    ]
  }, [current, typed])

  const showList = open && typed.length >= MIN_LENGTH
  const activeIndex = active < options.length ? active : -1
  const optionId = (index) => `${listId}-option-${index}`

  const choose = (option) => {
    setOpen(false)
    if (option.type === 'all') onSubmit(option.value)
    else onPick(option)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!options.length) return
      event.preventDefault()
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      // -1 is "back in the text box", so the list wraps through it.
      setActive((index) => {
        const next = index + step
        if (next >= options.length) return -1
        if (next < -1) return options.length - 1
        return next
      })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (showList && activeIndex >= 0) choose(options[activeIndex])
      else {
        setOpen(false)
        onSubmit(typed)
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      if (showList) {
        setOpen(false)
        setActive(-1)
      } else if (onClose) onClose()
      else event.currentTarget.blur()
    }
  }

  const statusText = !showList
    ? ''
    : loading
      ? 'Loading suggestions'
      : current?.error
        ? 'Suggestions are unavailable'
        : options.length > 1
          ? `${options.length - 1} suggestions. Use the up and down arrows to choose.`
          : 'No suggestions'

  const optionClass = (index) =>
    `flex min-h-[44px] w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-sm ${index === activeIndex ? 'bg-sand' : 'hover:bg-sand/60'}`

  const renderOption = (option, index) => {
    const common = {
      id: optionId(index),
      role: 'option',
      'aria-selected': index === activeIndex,
      className: optionClass(index),
      // mousedown, not click: the input keeps focus, so the list does not close before the choice registers.
      onMouseDown: (event) => {
        event.preventDefault()
        choose(option)
      },
      onMouseMove: () => setActive(index),
    }
    if (option.type === 'product') {
      const product = option.value
      return (
        <li key={option.key} {...common}>
          <span className="grid h-10 w-10 shrink-0 place-items-center bg-sand p-1">
            <img src={product.image} alt="" className="h-full w-full object-contain" loading="lazy" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{product.name}</span>
            <span className="block truncate text-xs text-stone">{product.brand || formatCategory(product.category)}</span>
          </span>
          <Price value={product.price} className="shrink-0 text-xs font-semibold" />
        </li>
      )
    }
    const Icon = option.type === 'category' ? CategoryOutlinedIcon : option.type === 'brand' ? SellOutlinedIcon : SearchRoundedIcon
    const label =
      option.type === 'category' ? formatCategory(option.value) : option.type === 'brand' ? option.value : `See all results for “${option.value}”`
    return (
      <li key={option.key} {...common}>
        <Icon sx={{ fontSize: 18 }} className="shrink-0 text-stone" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {option.type !== 'all' && (
          <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-stone">{option.type}</span>
        )}
      </li>
    )
  }

  const products = options.filter((option) => option.type === 'product')
  const others = options.filter((option) => option.type !== 'product')

  return (
    <div className={rootClassName}>
      <input
        id={inputId}
        autoFocus={autoFocus}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-label={inputId ? undefined : 'Search products'}
        autoComplete="off"
        enterKeyHint="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${inputClassName} [&::-webkit-search-cancel-button]:hidden`}
      />

      <p className="sr-only" role="status" aria-live="polite">{statusText}</p>

      {showList && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain bg-surface shadow-[0_24px_60px_-28px_rgba(0,0,0,0.45)] ring-1 ring-line">
          {loading && (
            <p className="flex items-center gap-3 px-4 py-4 text-sm text-stone">
              <CircularProgress size={14} color="inherit" /> Searching…
            </p>
          )}
          {!loading && current?.error && (
            <p className="px-4 py-4 text-sm text-stone">Suggestions are unavailable right now. Press Enter to search the shop.</p>
          )}
          {/* The listbox is always in the DOM while open, so aria-controls always points at something. */}
          <ul id={listId} role="listbox" aria-label="Search suggestions" className={loading || current?.error ? 'hidden' : 'py-2'}>
            {products.length > 0 && (
              <li role="presentation" className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone">Pieces</li>
            )}
            {products.map((option) => renderOption(option, options.indexOf(option)))}
            {others.length > 1 && (
              <li role="presentation" className="mt-1 border-t border-line px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone">
                Categories and brands
              </li>
            )}
            {!loading && !current?.error && options.length === 1 && (
              <li role="presentation" className="px-4 py-3 text-sm text-stone">No pieces match “{typed}”.</li>
            )}
            {others.map((option) => renderOption(option, options.indexOf(option)))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default SearchSuggestions
