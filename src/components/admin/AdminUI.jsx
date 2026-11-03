import { Alert } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import { Link } from 'react-router-dom'
import EmptyState from '../EmptyState'

/** Building blocks shared by every admin screen, so they all look and behave the same. */

export function AdminPageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-5 border-b border-line pb-7 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="font-display text-3xl leading-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-stone">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}

const chipClass = (active) =>
  `shrink-0 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
    active ? 'border-ink bg-ink text-ivory' : 'border-line bg-surface text-ink hover:border-ink'
  }`

// options: [{ id, label, count? }]; an id of '' means "no filter".
export function FilterChips({ options, value, onChange, label }) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id || 'all'}
          type="button"
          className={`${chipClass(value === option.id)} capitalize`}
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
        >
          {option.label}
          {option.count != null && <span className="ml-1.5 opacity-60">{option.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function SearchField({ value, onChange, placeholder, label }) {
  return (
    <label className="flex h-11 w-full items-center gap-2 border border-line bg-surface px-3 transition-colors focus-within:border-ink md:w-72">
      <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-stone" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone/70 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="text-stone hover:text-ink">
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </button>
      )}
    </label>
  )
}

// Filters row: chips on the left, search on the right.
export function Toolbar({ children }) {
  return <div className="mt-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">{children}</div>
}

export function StatCard({ icon: Icon, label, value, note, loading, tone }) {
  return (
    <div className="bg-surface p-6 ring-1 ring-line">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone">{label}</p>
        <Icon sx={{ fontSize: 20 }} className={tone === 'alert' ? 'text-red-700 dark:text-red-400' : 'text-gold'} />
      </div>
      {loading ? (
        <div className="mt-4 h-10 w-2/3 animate-pulse bg-sand" />
      ) : (
        <p className="mt-4 font-display text-4xl tabular-nums">{value}</p>
      )}
      {note && <p className="mt-2 text-sm text-stone">{note}</p>}
    </div>
  )
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`bg-surface p-6 ring-1 ring-line sm:p-7 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function PanelLink({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone transition-colors hover:text-ink">
      {children} <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
    </Link>
  )
}

// Horizontal scroll stays inside the card on small screens.
export function DataTable({ minWidth = 760, children }) {
  return (
    <div className="mt-6 overflow-x-auto bg-surface ring-1 ring-line">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ columns }) {
  return (
    <thead className="border-b border-line text-[10px] uppercase tracking-[0.18em] text-stone">
      <tr>
        {columns.map((column) => (
          <th key={column.label} scope="col" className={`px-5 py-4 font-semibold ${column.align === 'right' ? 'text-right' : ''}`}>
            {column.hidden ? <span className="sr-only">{column.label}</span> : column.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="mt-6 space-y-px bg-line ring-1 ring-line" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex animate-pulse items-center gap-4 bg-surface p-4">
          <div className="h-12 w-12 bg-sand" />
          <div className="h-4 flex-1 bg-sand" />
          <div className="hidden h-4 w-24 bg-sand sm:block" />
          <div className="h-4 w-16 bg-sand" />
        </div>
      ))}
    </div>
  )
}

export function AdminEmpty(props) {
  return (
    <div className="mt-6 bg-surface ring-1 ring-line">
      <EmptyState compact {...props} />
    </div>
  )
}

export function LoadError({ message, onRetry }) {
  return (
    <Alert
      severity="error"
      className="mt-6"
      action={
        <button type="button" onClick={onRetry} className="px-3 text-sm font-semibold underline">
          Retry
        </button>
      }
    >
      {message}
    </Alert>
  )
}

// Small "piece" thumbnail used in admin tables; never links to the storefront.
export function Thumb({ src, size = 'h-12 w-12' }) {
  return (
    <span className={`${size} block shrink-0 bg-sand p-1`}>
      <img src={src} alt="" loading="lazy" className="h-full w-full object-contain" />
    </span>
  )
}
