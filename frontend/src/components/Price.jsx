import useMoney from '../hooks/useMoney'
import { money } from '../utils/format'

/**
 * A store price in the customer's display currency. Converted amounts start with "≈" and say, on hover and to
 * screen readers, what is actually charged.
 */
function Price({ value, className }) {
  const { format, converted, currency, storeCurrency } = useMoney()
  if (!converted) return <span className={className}>{money(value)}</span>
  return (
    <span className={className} title={`Approximate price in ${currency}. You pay ${money(value)} (${storeCurrency}) at checkout.`}>
      ≈ {format(value)}
      <span className="sr-only"> approximately; charged as {money(value)}</span>
    </span>
  )
}

// One line explaining converted prices; renders nothing when prices are already in the charged currency.
export function CurrencyNote({ className = '' }) {
  const { converted, currency, storeCurrency } = useMoney()
  if (!converted) return null
  return (
    <p className={`text-xs leading-relaxed text-stone ${className}`}>
      Prices in {currency} are approximate conversions. You are charged in {storeCurrency} at checkout.
    </p>
  )
}

export default Price
