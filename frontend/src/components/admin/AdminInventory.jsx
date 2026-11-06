import { useEffect, useMemo, useState } from 'react'
import { CircularProgress } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import { useDispatch, useSelector } from 'react-redux'
import useQueryParams from '../../hooks/useQueryParams'
import { fetchproduct, updateStock } from '../../toolkit/productslice'
import { formatCategory, LOW_STOCK_THRESHOLD, money, stockLevel } from '../../utils/format'
import {
  AdminEmpty,
  AdminPageHeader,
  DataTable,
  FilterChips,
  LoadError,
  SearchField,
  StatCard,
  TableHead,
  TableSkeleton,
  Thumb,
  Toolbar,
} from './AdminUI'
import StockStatus from './StockStatus'

const STOCK_FILTERS = [
  { id: '', label: 'All' },
  { id: 'low', label: 'Low stock', test: (product) => stockLevel(product.stock) !== 'ok' },
  { id: 'out', label: 'Out of stock', test: (product) => stockLevel(product.stock) === 'out' },
  { id: 'ok', label: 'Healthy', test: (product) => stockLevel(product.stock) === 'ok' },
]

const COLUMNS = [
  { label: 'Product' },
  { label: 'Status' },
  { label: 'Stock value', align: 'right' },
  { label: 'Units in stock' },
  { label: 'Save', hidden: true, align: 'right' },
]

// Matches MAX_STOCK in backend/routes/productRoutes.js.
const MAX_STOCK = 1000000

// Drafts are kept as typed text so an empty or half-typed field can be shown as invalid instead of becoming 0.
const parseDraft = (text) => {
  if (!/^\d+$/.test(text.trim())) return { error: 'Enter a whole number' }
  const value = Number(text)
  if (value > MAX_STOCK) return { error: `At most ${MAX_STOCK.toLocaleString()}` }
  return { value }
}

const smallButton = 'h-9 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-30'

// −/+ or typing only changes the draft; nothing is sent until Save. Enter saves the row, Escape resets it.
function StockEditor({ product, draft, saving, onChange, onSave, onReset }) {
  const text = draft ?? String(product.stock)
  const { value, error } = parseDraft(text)
  const dirty = draft !== undefined
  const base = value ?? product.stock
  const buttonClass = 'grid h-full w-8 place-items-center transition hover:bg-sand disabled:opacity-30'

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`inline-flex h-9 w-fit items-center border bg-surface ${error ? 'border-red-600' : dirty ? 'border-gold' : 'border-line'}`}
        role="group"
        aria-label={`Stock for ${product.title}`}
      >
        <button type="button" className={buttonClass} onClick={() => onChange(String(Math.max(0, base - 1)))} disabled={base === 0 || saving} aria-label="Decrease stock">
          <RemoveRoundedIcon sx={{ fontSize: 16 }} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={text}
          disabled={saving}
          onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && dirty && !error) onSave()
            if (event.key === 'Escape') onReset()
          }}
          aria-label={`Units in stock for ${product.title}`}
          aria-invalid={Boolean(error)}
          className="h-full w-16 bg-transparent text-center text-sm font-medium tabular-nums outline-none"
        />
        <button type="button" className={buttonClass} onClick={() => onChange(String(Math.min(MAX_STOCK, base + 1)))} disabled={base >= MAX_STOCK || saving} aria-label="Increase stock">
          <AddRoundedIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
      {/* Fixed-height line so rows do not jump when a hint appears. */}
      <p className={`h-4 text-[11px] ${error ? 'text-red-700 dark:text-red-400' : 'text-stone'}`} aria-live="polite">
        {error ?? (dirty ? `Was ${product.stock}` : '')}
      </p>
    </div>
  )
}

// Always rendered, so the button never moves; it is simply disabled until the row has a valid change.
function RowActions({ dirty, invalid, saving, onSave, onReset }) {
  return (
    <div className="flex items-center justify-end gap-2 pb-5">
      <button type="button" onClick={onReset} disabled={!dirty || saving} className={`${smallButton} text-stone hover:text-ink`}>
        Reset
      </button>
      <button type="button" onClick={onSave} disabled={!dirty || invalid || saving} className={`${smallButton} min-w-[64px] bg-ink text-ivory hover:bg-gold`}>
        {saving ? <CircularProgress size={12} color="inherit" /> : 'Save'}
      </button>
    </div>
  )
}

// Sticks under the admin header while scrolling, so pending changes and "Save all" are always in reach.
function SaveBar({ count, invalid, saving, onSaveAll, onDiscardAll }) {
  return (
    <div
      className={`sticky top-16 z-20 mt-6 flex flex-col gap-3 px-5 py-3 ring-1 transition-colors sm:flex-row sm:items-center sm:justify-between ${
        count ? 'bg-gold-soft ring-gold/40' : 'bg-surface ring-line'
      }`}
      role="region"
      aria-label="Unsaved stock changes"
    >
      <p className="text-sm" aria-live="polite">
        {count === 0 ? (
          <span className="text-stone">No unsaved changes. Adjust any quantity below, then save.</span>
        ) : (
          <>
            <strong>{count}</strong> unsaved {count === 1 ? 'change' : 'changes'}
            {invalid > 0 && <span className="text-red-700 dark:text-red-400"> · fix {invalid} invalid {invalid === 1 ? 'value' : 'values'} to save</span>}
          </>
        )}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={onDiscardAll} disabled={!count || saving} className={`${smallButton} border border-ink text-ink hover:bg-ink hover:text-ivory`}>
          Discard all
        </button>
        <button type="button" onClick={onSaveAll} disabled={!count || invalid > 0 || saving} className={`${smallButton} min-w-[96px] bg-ink text-ivory hover:bg-gold`}>
          {saving ? <CircularProgress size={12} color="inherit" /> : count > 1 ? `Save all (${count})` : 'Save'}
        </button>
      </div>
    </div>
  )
}

function AdminInventory() {
  const dispatch = useDispatch()
  const { items: products, status, error } = useSelector((state) => state.products)
  const [params, setParams] = useQueryParams()

  const filter = STOCK_FILTERS.find((item) => item.id === (params.get('stock') ?? '')) ?? STOCK_FILTERS[0]
  const query = params.get('q') ?? ''
  // { [productId]: typed text }, only for rows whose value differs from the saved stock.
  const [drafts, setDrafts] = useState({})
  // Keys being saved: a product id for a row save, 'all' while Save all runs.
  const [saving, setSaving] = useState(() => new Set())

  const productIds = useMemo(() => new Set(products.map((product) => product.id)), [products])
  const pending = Object.entries(drafts).filter(([id]) => productIds.has(id))
  const invalidCount = pending.filter(([, text]) => parseDraft(text).error).length

  // Leaving the page with unsaved stock edits asks for confirmation.
  useEffect(() => {
    if (!pending.length) return undefined
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [pending.length])

  const setDraft = (product, text) =>
    setDrafts((current) => {
      const next = { ...current }
      if (text === String(product.stock)) delete next[product.id]
      else next[product.id] = text
      return next
    })

  const resetDrafts = (ids) =>
    setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !ids.includes(id))))

  const save = async (entries, key) => {
    const updates = entries.map(([id, text]) => ({ id, stock: parseDraft(text).value }))
    if (!updates.length || updates.some((update) => update.stock === undefined)) return

    setSaving((current) => new Set(current).add(key))
    try {
      await dispatch(updateStock(updates)).unwrap()
      resetDrafts(updates.map((update) => update.id))
    } catch {
      // The toast listener reports the error; drafts stay so the save can be retried
    } finally {
      setSaving((current) => {
        const next = new Set(current)
        next.delete(key)
        return next
      })
    }
  }

  const isSaving = (id) => saving.has(id) || saving.has('all')

  const summary = useMemo(() => {
    const count = (level) => products.filter((product) => stockLevel(product.stock) === level).length
    return {
      units: products.reduce((total, product) => total + product.stock, 0),
      value: products.reduce((total, product) => total + product.stock * product.price, 0),
      low: count('low'),
      out: count('out'),
    }
  }, [products])

  // Stock as it was when the list was loaded, filtered or searched. Ordering and filtering use it, so a row does
  // not jump or vanish the moment its new quantity is saved. `products` is deliberately left out of the deps.
  const listedStock = useMemo(
    () => new Map(products.map((product) => [product.id, product.stock])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, filter.id, query, products.length],
  )

  // Most urgent first: lowest stock at the top.
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    const listed = (product) => ({ ...product, stock: listedStock.get(product.id) ?? product.stock })
    return products
      .filter((product) => (filter.test ? filter.test(listed(product)) : true))
      .filter((product) => !term || [product.title, product.brand, product.sku].filter(Boolean).join(' ').toLowerCase().includes(term))
      .sort((a, b) => listed(a).stock - listed(b).stock)
  }, [products, filter, query, listedStock])

  const loading = status === 'idle' || status === 'loading'
  const counts = { '': products.length, low: summary.low + summary.out, out: summary.out, ok: products.length - summary.low - summary.out }

  return (
    <>
      <AdminPageHeader title="Inventory" description={`Stock levels across the catalogue · low stock means ${LOW_STOCK_THRESHOLD} units or fewer`} />

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Inventory2OutlinedIcon} label="Units in stock" value={summary.units.toLocaleString()} note={`${products.length} products`} loading={loading} />
        <StatCard icon={PaymentsOutlinedIcon} label="Stock value" value={money(summary.value)} note="At current prices" loading={loading} />
        <StatCard icon={WarningAmberRoundedIcon} label="Low stock" value={summary.low} note="Restock soon" loading={loading} />
        <StatCard
          icon={RemoveShoppingCartOutlinedIcon}
          label="Out of stock"
          value={summary.out}
          note="Urgent Purchase"
          loading={loading}
          tone={summary.out > 0 ? 'alert' : undefined}
        />
      </div>

      <Toolbar>
        <FilterChips
          label="Filter by stock level"
          options={STOCK_FILTERS.map((item) => ({ id: item.id, label: item.label, count: counts[item.id] }))}
          value={filter.id}
          onChange={(id) => setParams({ stock: id })}
        />
        <SearchField label="Search inventory" value={query} onChange={(value) => setParams({ q: value })} placeholder="Name, brand or SKU" />
      </Toolbar>

      {!loading && products.length > 0 && (
        <SaveBar
          count={pending.length}
          invalid={invalidCount}
          saving={saving.size > 0}
          onSaveAll={() => save(pending, 'all')}
          onDiscardAll={() => setDrafts({})}
        />
      )}

      {status === 'failed' && <LoadError message={`Could not load products: ${error}`} onRetry={() => dispatch(fetchproduct())} />}

      {loading ? (
        <TableSkeleton />
      ) : visible.length === 0 ? (
        status === 'succeeded' && (
          <AdminEmpty
            icon={Inventory2OutlinedIcon}
            title={query ? 'No matching products' : filter.id ? `Nothing ${filter.label.toLowerCase()}` : 'No products yet'}
            description={query ? 'Try a different search.' : filter.id === 'low' || filter.id === 'out' ? 'Every product is comfortably stocked.' : 'Products appear here once they are added.'}
            action={
              (query || filter.id) && (
                <button type="button" onClick={() => setParams({ stock: null, q: null })} className="btn-outline">Show all products</button>
              )
            }
          />
        )
      ) : (
        <DataTable minWidth={880}>
          <TableHead columns={COLUMNS} />
          <tbody className="divide-y divide-line">
            {visible.map((product) => {
              const draft = drafts[product.id]
              const dirty = draft !== undefined
              const rowSaving = isSaving(product.id)
              const rowSave = () => save([[product.id, draft]], product.id)
              const rowReset = () => resetDrafts([product.id])

              return (
                <tr
                  key={product.id}
                  className={`align-middle transition-colors ${dirty ? 'bg-gold-soft/50 shadow-[inset_3px_0_0_rgb(var(--gold))]' : 'hover:bg-ivory/60'}`}
                >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-4">
                    <Thumb src={product.thumbnail} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-display text-base">
                        <span className="line-clamp-1">{product.title}</span>
                        {dirty && (
                          <span className="shrink-0 bg-gold px-1.5 py-0.5 font-body text-[9px] font-semibold uppercase tracking-[0.14em] text-ivory">Unsaved</span>
                        )}
                      </p>
                      <p className="text-xs text-stone">{[formatCategory(product.category), product.sku].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3"><StockStatus stock={product.stock} /></td>
                <td className="px-5 py-3 text-right tabular-nums text-stone">{money(product.stock * product.price)}</td>
                <td className="px-5 pb-0 pt-5">
                  <StockEditor
                    product={product}
                    draft={draft}
                    saving={rowSaving}
                    onChange={(text) => setDraft(product, text)}
                    onSave={rowSave}
                    onReset={rowReset}
                  />
                </td>
                <td className="px-5 pb-0 pt-5">
                  <RowActions
                    dirty={dirty}
                    invalid={dirty && Boolean(parseDraft(draft).error)}
                    saving={rowSaving}
                    onSave={rowSave}
                    onReset={rowReset}
                  />
                </td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      )}
    </>
  )
}

export default AdminInventory
