import { useSelector } from 'react-redux'
import { convertAmount } from '../../../shared/currencies.js'
import { CURRENCY, formatMoneyIn, money } from '../utils/format'

/**
 * Formats store prices in the customer's display currency. Re-renders when the currency or rates change, so
 * prices update without a reload. Falls back to the store currency (exactly what is charged) whenever no
 * usable rate is loaded, or when the API's store currency differs from this build's VITE_CURRENCY.
 *
 * converted: true when the amounts shown are approximate conversions rather than the charged currency.
 */
export default function useMoney() {
  const { selected, rates, status, base } = useSelector((state) => state.currency)
  const target = selected ?? CURRENCY
  const converted = target !== CURRENCY && status === 'ready' && base === CURRENCY && Number.isFinite(rates?.[target])

  const format = (value) => (converted ? formatMoneyIn(convertAmount(value, target, rates), target) : money(value))

  return { format, converted, currency: converted ? target : CURRENCY, storeCurrency: CURRENCY }
}
