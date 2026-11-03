import { useMemo, useState } from 'react'
import { CircularProgress } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import RemoveShoppingCartOutlinedIcon from '@mui/icons-material/RemoveShoppingCartOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import { useDispatch, useSelector } from 'react-redux'
import useQueryParams from '../../hooks/useQueryParams'
import { fetchproduct, updateProduct } from '../../toolkit/productslice'
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
]

// Adjust with −/+ or type a number, then save; nothing is sent until the value is confirmed.
function StockEditor({ product }) {
  const dispatch = useDispatch()
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const value = draft ?? product.stock
  const changed = draft !== null && draft !== product.stock

  const save = async () => {
    setSaving(true)
    try {
      await dispatch(updateProduct({ id: product.id, changes: { stock: value } })).unwrap()
      setDraft(null)
    } catch {
      // The toast listener reports the error; keep the draft so it can be retried
    } finally {
      setSaving(false)
    }
  }

  const buttonClass = 'grid h-full w-8 place-items-center transition hover:bg-sand disabled:opacity-30'

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex h-9 items-center border border-line bg-surface" role="group" aria-label={`Stock for ${product.title}`}>
        <button type="button" className={buttonClass} onClick={() => setDraft(Math.max(0, value - 1))} disabled={value === 0 || saving} aria-label="Decrease stock">
          <RemoveRoundedIcon sx={{ fontSize: 16 }} />
        </button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(event) => setDraft(Math.max(0, Math.floor(Number(event.target.value) || 0)))}
          onKeyDown={(event) => event.key === 'Enter' && changed && save()}
          aria-label={`Units in stock for ${product.title}`}
          className="h-full w-14 bg-transparent text-center text-sm font-medium tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button type="button" className={buttonClass} onClick={() => setDraft(value + 1)} disabled={saving} aria-label="Increase stock">
          <AddRoundedIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
      {changed && (
        <>
          <button type="button" onClick={save} disabled={saving} className="h-9 min-w-[56px] bg-ink px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ivory transition hover:bg-gold">
            {saving ? <CircularProgress size={12} color="inherit" /> : 'Save'}
          </button>
          <button type="button" onClick={() => setDraft(null)} disabled={saving} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone hover:text-ink">
            Reset
          </button>
        </>
      )}
    </div>
  )
}

function AdminInventory() {
  const dispatch = useDispatch()
  const { items: products, status, error } = useSelector((state) => state.products)
  const [params, setParams] = useQueryParams()

  const filter = STOCK_FILTERS.find((item) => item.id === (params.get('stock') ?? '')) ?? STOCK_FILTERS[0]
  const query = params.get('q') ?? ''

  const summary = useMemo(() => {
    const count = (level) => products.filter((product) => stockLevel(product.stock) === level).length
    return {
      units: products.reduce((total, product) => total + product.stock, 0),
      value: products.reduce((total, product) => total + product.stock * product.price, 0),
      low: count('low'),
      out: count('out'),
    }
  }, [products])

  // Most urgent first: lowest stock at the top.
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return products
      .filter((product) => (filter.test ? filter.test(product) : true))
      .filter((product) => !term || [product.title, product.brand, product.sku].filter(Boolean).join(' ').toLowerCase().includes(term))
      .sort((a, b) => a.stock - b.stock)
  }, [products, filter, query])

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
          note="Not purchasable"
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
        <DataTable minWidth={760}>
          <TableHead columns={COLUMNS} />
          <tbody className="divide-y divide-line">
            {visible.map((product) => (
              <tr key={product.id} className="align-middle transition-colors hover:bg-ivory/60">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-4">
                    <Thumb src={product.thumbnail} />
                    <div className="min-w-0">
                      <p className="line-clamp-1 font-display text-base">{product.title}</p>
                      <p className="text-xs text-stone">{[formatCategory(product.category), product.sku].filter(Boolean).join(' · ')}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3"><StockStatus stock={product.stock} /></td>
                <td className="px-5 py-3 text-right tabular-nums text-stone">{money(product.stock * product.price)}</td>
                <td className="px-5 py-3">
                  <StockEditor key={product.stock} product={product} />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  )
}

export default AdminInventory
