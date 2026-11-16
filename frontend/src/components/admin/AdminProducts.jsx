import { useEffect, useMemo, useState } from 'react'
import { IconButton, Tooltip } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import SellOutlinedIcon from '@mui/icons-material/SellOutlined'
import { useDispatch } from 'react-redux'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { useProductList, useProductSummary } from '../../hooks/useProducts'
import useQueryParams from '../../hooks/useQueryParams'
import { deleteProduct } from '../../toolkit/productSlice'
import { formatCategory, formatDate, money } from '../../utils/format'
import ConfirmDialog from '../ConfirmDialog'
import Pagination from '../Pagination'
import { AdminEmpty, AdminPageHeader, DataTable, LoadError, SearchField, TableHead, TableSkeleton, Thumb, Toolbar } from './AdminUI'
import ProductFormDialog from './ProductFormDialog'
import StockStatus from './StockStatus'

const ADMIN_PAGE_SIZE = 25

const COLUMNS = [
  { label: 'Product' },
  { label: 'Category' },
  { label: 'Price', align: 'right' },
  { label: 'Stock' },
  { label: 'Rating' },
  { label: 'Updated' },
  { label: 'Actions', hidden: true, align: 'right' },
]

// Catalogue management: create, edit and delete. Stock levels are adjusted on the Inventory screen.
function AdminProducts() {
  const dispatch = useDispatch()
  const [params, setParams] = useQueryParams()
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const query = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)
  const formOpen = params.has('new') || Boolean(editing)
  const search = useDebouncedValue(query.trim(), 300)

  // Newest first, so a product that was just added is at the top. Search covers name, brand, SKU and category.
  const { products: visible, total, totalPages, loading: listLoading, placeholder, error, refetch } = useProductList({
    page,
    pageSize: ADMIN_PAGE_SIZE,
    sort: 'newest',
    category,
    search,
  })
  const { data: summary } = useProductSummary()
  const categories = useMemo(() => (summary?.categories ?? []).map((item) => item.name), [summary])

  // A filter change starts from page 1; deleting the last product on a page steps back a page.
  const setFilter = (changes) => setParams({ ...changes, page: null })
  useEffect(() => {
    if (!listLoading && !error && page > totalPages) setParams({ page: totalPages > 1 ? totalPages : null })
  }, [listLoading, error, page, totalPages, setParams])

  const closeForm = () => {
    setEditing(null)
    if (params.has('new')) setParams({ new: null })
  }

  const confirmDelete = async () => {
    setDeleteBusy(true)
    try {
      await dispatch(deleteProduct(deleting.id)).unwrap()
      setDeleting(null)
    } catch {
      // Reported by the toast listener
    } finally {
      setDeleteBusy(false)
    }
  }

  const loading = listLoading && visible.length === 0
  const filtered = query || category

  return (
    <>
      <AdminPageHeader
        title="Products"
        description={summary ? `${summary.total} products across ${categories.length} categories` : 'Loading…'}
        actions={
          <button type="button" onClick={() => setParams({ new: '1' })} className="btn-primary">
            <AddRoundedIcon sx={{ fontSize: 18 }} /> Add product
          </button>
        }
      />

      <Toolbar>
        <label className="w-full md:w-auto">
          <span className="sr-only">Filter by category</span>
          <select
            value={category}
            onChange={(event) => setFilter({ category: event.target.value })}
            className="h-11 w-full cursor-pointer border border-line bg-surface px-4 pr-8 text-sm outline-none focus:border-ink md:w-60"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>{formatCategory(item)}</option>
            ))}
          </select>
        </label>
        <SearchField label="Search products" value={query} onChange={(value) => setFilter({ q: value })} placeholder="Name, brand or SKU" />
      </Toolbar>

      {error && <LoadError message={`Could not load products: ${error}`} onRetry={refetch} />}

      {loading ? (
        <TableSkeleton />
      ) : visible.length === 0 ? (
        !error && !listLoading && (
          <AdminEmpty
            icon={SellOutlinedIcon}
            title={filtered ? 'No matching products' : 'No products yet'}
            description={filtered ? 'Try a different category or search.' : 'Add your first product to open the boutique.'}
            action={
              filtered ? (
                <button type="button" onClick={() => setFilter({ q: null, category: null })} className="btn-outline">Clear filters</button>
              ) : (
                <button type="button" onClick={() => setParams({ new: '1' })} className="btn-primary">Add product</button>
              )
            }
          />
        )
      ) : (
        <DataTable minWidth={900}>
          <TableHead columns={COLUMNS} />
          <tbody className={`divide-y divide-line transition-opacity ${placeholder ? 'opacity-50' : ''}`} aria-busy={listLoading}>
            {visible.map((product) => (
              <tr key={product.id} className="align-middle transition-colors hover:bg-ivory/60">
                <td className="px-5 py-3">
                  <button type="button" onClick={() => setEditing(product)} className="group flex items-center gap-4 text-left">
                    <Thumb src={product.thumbnail} />
                    <span className="min-w-0">
                      <span className="line-clamp-1 font-display text-base group-hover:text-gold">{product.title}</span>
                      <span className="block text-xs text-stone">{[product.brand, product.sku].filter(Boolean).join(' · ') || '—'}</span>
                    </span>
                  </button>
                </td>
                <td className="px-5 py-3 text-stone">{formatCategory(product.category)}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  <span className="font-semibold">{money(product.price)}</span>
                  {product.discountPercentage >= 1 && (
                    <span className="block text-xs text-gold">−{Math.round(product.discountPercentage)}%</span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className="font-medium tabular-nums">{product.stock}</span>
                  <span className="ml-2"><StockStatus stock={product.stock} /></span>
                </td>
                <td className="px-5 py-3 text-stone tabular-nums">
                  {product.rating ? product.rating.toFixed(1) : '—'}
                  <span className="ml-1 text-xs">({product.reviews?.length ?? 0})</span>
                </td>
                <td className="px-5 py-3 text-xs text-stone">{product.updatedAt ? formatDate(product.updatedAt) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <Tooltip title="Edit">
                    <IconButton onClick={() => setEditing(product)} aria-label={`Edit ${product.title}`}>
                      <EditOutlinedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => setDeleting(product)} aria-label={`Delete ${product.title}`} className="hover:!text-red-700">
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {!loading && total > 0 && (
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-stone">
            {(Math.min(page, totalPages) - 1) * ADMIN_PAGE_SIZE + 1}–{Math.min(Math.min(page, totalPages) * ADMIN_PAGE_SIZE, total)} of {total}
          </p>
          <Pagination page={Math.min(page, totalPages)} totalPages={totalPages} onChange={(next) => setParams({ page: next > 1 ? next : null })} label="Product pages" />
        </div>
      )}

      <ProductFormDialog open={formOpen} product={editing} categories={categories} onClose={closeForm} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.title ?? 'this product'}?`}
        description="It will be removed from the catalogue and from customers' wishlists. Past orders keep their copy of the item."
        confirmLabel="Delete product"
        busy={deleteBusy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}

export default AdminProducts
