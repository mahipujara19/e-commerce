import { useEffect, useState } from 'react'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import useQueryParams from '../../hooks/useQueryParams'
import { api } from '../../utils/api'
import { formatDate } from '../../utils/format'
import { AdminEmpty, AdminPageHeader, DataTable, FilterChips, LoadError, TableHead, TableSkeleton, Toolbar } from './AdminUI'

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'order', label: 'Orders' },
  { id: 'product', label: 'Products & stock' },
  { id: 'user', label: 'Accounts & roles' },
  { id: 'coupon', label: 'Coupons' },
]

const COLUMNS = [{ label: 'When' }, { label: 'Who' }, { label: 'What' }]

// Admin only: who changed stock, prices, products, roles, orders and coupons. Kept for a year.
function AdminActivity() {
  const [params, setParams] = useQueryParams()
  const action = FILTERS.some((filter) => filter.id === params.get('type')) ? params.get('type') : ''
  // `loaded` names the request the data belongs to; while it differs from the current one, a load is in flight.
  const [attempt, setAttempt] = useState(0)
  const request = `${action}|${attempt}`
  const [state, setState] = useState({ loaded: null, items: [], error: '' })
  const loading = state.loaded !== request

  useEffect(() => {
    let active = true
    api(`/admin/audit-logs?limit=300${action ? `&action=${action}` : ''}`)
      .then((items) => active && setState({ loaded: request, items, error: '' }))
      .catch((error) => active && setState((current) => ({ ...current, loaded: request, error: error.message })))
    return () => {
      active = false
    }
  }, [action, request])

  const retry = () => setAttempt((count) => count + 1)
  const status = loading ? 'loading' : state.error ? 'failed' : 'succeeded'

  return (
    <>
      <AdminPageHeader title="Activity" description="Every change made in the admin area, newest first. Kept for 12 months." />
      <Toolbar>
        <FilterChips label="Filter activity" options={FILTERS} value={action} onChange={(id) => setParams({ type: id })} />
      </Toolbar>

      {status === 'failed' && <LoadError message={`Could not load activity: ${state.error}`} onRetry={retry} />}

      {status === 'loading' && !state.items.length ? (
        <TableSkeleton />
      ) : state.items.length === 0 ? (
        status === 'succeeded' && <AdminEmpty icon={HistoryRoundedIcon} title="No activity yet" description="Changes made by your team will appear here." />
      ) : (
        <DataTable minWidth={720}>
          <TableHead columns={COLUMNS} />
          <tbody className="divide-y divide-line">
            {state.items.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="whitespace-nowrap px-5 py-4 text-sm text-stone">
                  {formatDate(entry.createdAt, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-medium">{entry.actorName ?? 'Unknown'}</p>
                  <p className="max-w-[220px] truncate text-xs text-stone">{entry.actorEmail}</p>
                </td>
                <td className="px-5 py-4 text-sm">
                  <span className="mr-2 bg-sand px-2 py-0.5 font-mono text-[11px]">{entry.action}</span>
                  {entry.summary}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  )
}

export default AdminActivity
