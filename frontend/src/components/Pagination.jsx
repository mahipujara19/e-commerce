import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'

// Page numbers to show: always the first and last, plus the current one and its neighbours; null marks a gap.
const pageItems = (page, totalPages, neighbours) => {
  const pages = new Set([1, totalPages])
  for (let offset = -neighbours; offset <= neighbours; offset += 1) {
    const value = page + offset
    if (value >= 1 && value <= totalPages) pages.add(value)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  return sorted.flatMap((value, index) => (index > 0 && value - sorted[index - 1] > 1 ? [null, value] : [value]))
}

/**
 * Previous / numbered pages / next. Every control is at least 44px for touch. On phones only the neighbours of
 * the current page are numbered, so the row never overflows at 320px.
 */
function Pagination({ page, totalPages, onChange, label = 'Pages', className = '' }) {
  if (totalPages <= 1) return null

  const button = (active) =>
    `grid h-11 min-w-[44px] place-items-center px-3 text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
      active ? 'bg-ink text-ivory' : 'text-ink hover:bg-sand'
    }`

  const renderItems = (neighbours, extraClass) =>
    pageItems(page, totalPages, neighbours).map((value, index) =>
      value === null ? (
        <li key={`${neighbours}-gap-${index}`} className={`grid h-11 w-6 place-items-center text-stone ${extraClass}`} aria-hidden="true">…</li>
      ) : (
        <li key={`${neighbours}-${value}`} className={extraClass}>
          <button
            type="button"
            className={button(value === page)}
            onClick={() => onChange(value)}
            aria-current={value === page ? 'page' : undefined}
            aria-label={`Page ${value}`}
          >
            {value}
          </button>
        </li>
      ),
    )

  return (
    <nav aria-label={label} className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          <button type="button" className={button(false)} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeftRoundedIcon fontSize="small" />
          </button>
        </li>
        {renderItems(0, 'sm:hidden')}
        {renderItems(1, 'hidden sm:block')}
        <li>
          <button type="button" className={button(false)} onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRightRoundedIcon fontSize="small" />
          </button>
        </li>
      </ul>
      <p className="mt-3 text-center text-xs text-stone sm:hidden">Page {page} of {totalPages}</p>
    </nav>
  )
}

export default Pagination
