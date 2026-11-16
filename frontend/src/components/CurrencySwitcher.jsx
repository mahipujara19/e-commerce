import { useEffect, useId, useState } from 'react'
import { Menu, MenuItem } from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import { useDispatch, useSelector } from 'react-redux'
import { SUPPORTED_CURRENCIES } from '../../../shared/currencies.js'
import { fetchRates } from '../toolkit/currencyListeners'
import { setCurrency } from '../toolkit/currencySlice'
import { CURRENCY } from '../utils/format'
import CurrencyFlag from './CurrencyFlag'

// "Euro", "Indian Rupee"… from the browser, so no names are hard-coded.
const currencyName = (() => {
  try {
    const names = new Intl.DisplayNames(['en'], { type: 'currency' })
    return (code) => names.of(code) ?? code
  } catch {
    return (code) => code
  }
})()

/**
 * Display-currency picker for the header: a compact flag and code that opens a menu (keyboard: Enter/Space or
 * ↓ to open, arrows to move, Escape to close; focus returns to the button). Loads the rates once per visit; only
 * currencies with a rate are offered, and when no rates are available the picker hides and prices stay in the
 * store currency. The choice is kept by the currency slice (this browser for guests, the profile when signed in).
 */
function CurrencySwitcher({ className = '', compact = false }) {
  const dispatch = useDispatch()
  const { selected, rates, status, base } = useSelector((state) => state.currency)
  const [anchor, setAnchor] = useState(null)
  const menuId = useId()

  useEffect(() => {
    dispatch(fetchRates())
  }, [dispatch])

  if (status !== 'ready' || base !== CURRENCY) return null
  const options = SUPPORTED_CURRENCIES.filter((code) => Number.isFinite(rates?.[code]))
  const value = options.includes(selected) ? selected : CURRENCY

  const choose = (code) => {
    dispatch(setCurrency(code))
    setAnchor(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? menuId : undefined}
        aria-label={`Display currency: ${currencyName(value)} (${value}). Change currency`}
        title="Display currency"
        className={`inline-flex h-10 items-center gap-1.5 rounded-sm px-2 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-sand ${className}`}
      >
        <CurrencyFlag code={value} />
        <span className={compact ? 'hidden sm:inline' : ''}>{value}</span>
        <ExpandMoreRoundedIcon sx={{ fontSize: 16 }} className={`text-stone transition-transform ${anchor ? 'rotate-180' : ''}`} />
      </button>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { className: 'mt-1', sx: { minWidth: 260, maxHeight: 'min(70vh, 30rem)', borderRadius: 0, border: '1px solid rgb(var(--line))' } },
          list: { 'aria-label': 'Display currency' },
        }}
      >
        <li role="presentation" className="px-4 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone">
          Display prices in
        </li>
        {options.map((code) => (
          <MenuItem
            key={code}
            role="menuitemradio"
            aria-checked={code === value}
            selected={code === value}
            onClick={() => choose(code)}
            // Theme sand for hover and the current choice (not MUI's grey); the keyboard focus ring sits inside the row.
            sx={{
              gap: 1.5,
              minHeight: 44,
              '&:hover, &.Mui-focusVisible': { bgcolor: 'rgb(var(--sand))' },
              '&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': { bgcolor: 'rgb(var(--gold-soft))' },
              '&:focus-visible': { outlineOffset: '-2px' },
            }}
          >
            <CurrencyFlag code={code} />
            <span className="w-10 text-[12px] font-semibold tracking-[0.08em]">{code}</span>
            <span className="flex-1 truncate text-sm text-stone">{currencyName(code)}</span>
            {code === value && <CheckRoundedIcon sx={{ fontSize: 18 }} className="text-gold" aria-hidden="true" />}
          </MenuItem>
        ))}
        <li role="presentation" className="mt-1 max-w-[18rem] border-t border-line px-4 pb-1 pt-3 text-xs leading-relaxed text-stone">
          You are always charged in {CURRENCY}. Other currencies are shown as an approximate conversion.
        </li>
      </Menu>
    </>
  )
}

export default CurrencySwitcher
