import { useSelector } from 'react-redux'
import { convertAmount } from '../../../shared/currencies.js'
import { CURRENCY, formatMoneyIn, money, moneyShort } from '../utils/format'

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

  // Thresholds such as "free shipping over …": whole units, rounded up so the amount shown always qualifies
  // (the rule itself is checked in the store currency).
  const formatWhole = (value) =>
    converted
      ? new Intl.NumberFormat(target === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: target, minimumFractionDigits: 0, maximumFractionDigits: 0 })
          .format(Math.ceil(convertAmount(value, target, rates)))
      : moneyShort(value)

  return { format, formatWhole, converted, currency: converted ? target : CURRENCY, storeCurrency: CURRENCY }
}
