import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { SUPPORTED_CURRENCIES } from '../../../shared/currencies.js'
import { fetchRates } from '../toolkit/currencyListeners'
import { setCurrency } from '../toolkit/currencySlice'
import { CURRENCY } from '../utils/format'

/**
 * Display-currency picker for the top bar. Loads the rates once per visit; only currencies with a rate are
 * offered, and when no rates are available the picker hides and prices stay in the store currency.
 */
function CurrencySwitcher({ className = '' }) {
  const dispatch = useDispatch()
  const { selected, rates, status, base } = useSelector((state) => state.currency)

  useEffect(() => {
    dispatch(fetchRates())
  }, [dispatch])

  if (status !== 'ready' || base !== CURRENCY) return null
  const options = SUPPORTED_CURRENCIES.filter((code) => Number.isFinite(rates?.[code]))
  const value = options.includes(selected) ? selected : CURRENCY

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="sr-only">Display currency (you are charged in {CURRENCY})</span>
      <select
        value={value}
        onChange={(event) => dispatch(setCurrency(event.target.value))}
        className="cursor-pointer rounded-sm border border-cream/25 bg-transparent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cream outline-none transition hover:border-cream/60 focus-visible:border-gold-light sm:text-[11px]"
      >
        {options.map((code) => (
          <option key={code} value={code} className="bg-night text-cream">
            {code}{code === CURRENCY ? ' (charged)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

export default CurrencySwitcher
