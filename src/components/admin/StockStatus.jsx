import { stockLevel } from '../../utils/format'

const STYLES = {
  out: ['Out of stock', 'bg-red-600/10 text-red-700 dark:text-red-400'],
  low: ['Low stock', 'bg-gold-soft text-gold'],
  ok: ['In stock', 'bg-sand text-stone'],
}

function StockStatus({ stock }) {
  const [text, className] = STYLES[stockLevel(stock)]
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${className}`}>{text}</span>
  )
}

export default StockStatus
