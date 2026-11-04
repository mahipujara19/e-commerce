import { useMemo, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, CircularProgress, Dialog, IconButton, MenuItem, TextField } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import { useDispatch, useSelector } from 'react-redux'
import useQueryParams from '../../hooks/useQueryParams'
import { createUser, fetchCustomers, updateUserRole } from '../../toolkit/customerSlice'
import { formatDate } from '../../utils/format'
import { ROLE_LABELS, ROLES } from '../../utils/roles'
import ConfirmDialog from '../ConfirmDialog'
import { AdminEmpty, AdminPageHeader, DataTable, FilterChips, LoadError, SearchField, TableHead, TableSkeleton, Toolbar } from './AdminUI'

const ROLE_NOTES = {
  admin: 'Full access, including products and team management',
  staff: 'Orders, inventory and customers; cannot edit the catalogue or the team',
  customer: 'Storefront only',
}

const FILTERS = [
  { id: '', label: 'Team', test: (user) => user.role !== 'customer' },
  { id: 'customers', label: 'Customers', test: (user) => user.role === 'customer' },
  { id: 'all', label: 'All accounts', test: () => true },
]

const COLUMNS = [{ label: 'Account' }, { label: 'Role' }, { label: 'Email status' }, { label: 'Joined' }]

const paperSx = { borderRadius: 0, bgcolor: 'rgb(var(--ivory))', backgroundImage: 'none', width: '100%', maxWidth: 520, m: 2 }

// Mirrors the server's signup rules so mistakes are caught before submitting.
const memberSchema = Yup.object({
  name: Yup.string().trim().min(2, 'Name must be at least 2 characters').max(100).required('Name is required'),
  email: Yup.string().trim().email('Please enter a valid email address').required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[0-9]/, 'Password must contain at least one number')
    .matches(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*)')
    .required('Password is required'),
  role: Yup.string().oneOf(ROLES).required(),
})

function AddMemberDialog({ open, onClose }) {
  const dispatch = useDispatch()
  const [error, setError] = useState('')

  const formik = useFormik({
    initialValues: { name: '', email: '', password: '', role: 'staff' },
    validationSchema: memberSchema,
    onSubmit: async (values, { resetForm }) => {
      setError('')
      try {
        await dispatch(createUser({ ...values, name: values.name.trim(), email: values.email.trim() })).unwrap()
        resetForm()
        onClose()
      } catch (message) {
        setError(message)
      }
    },
  })

  const fieldProps = (name) => {
    const invalid = formik.touched[name] && Boolean(formik.errors[name])
    return {
      id: `member-${name}`,
      name,
      value: formik.values[name],
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: invalid,
      helperText: invalid ? formik.errors[name] : undefined,
    }
  }

  return (
    <Dialog open={open} onClose={formik.isSubmitting ? undefined : onClose} slotProps={{ paper: { sx: paperSx } }} aria-labelledby="member-form-title">
      <form onSubmit={formik.handleSubmit} noValidate className="p-7 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="member-form-title" className="font-display text-2xl leading-tight">Add a team member</h2>
            <p className="mt-2 text-sm text-stone">They sign in with this email and password and are asked to verify the address.</p>
          </div>
          <IconButton onClick={onClose} aria-label="Close" edge="end" disabled={formik.isSubmitting}>
            <CloseRoundedIcon />
          </IconButton>
        </div>

        <div className="mt-7 space-y-5">
          <TextField {...fieldProps('name')} label="Full name" autoComplete="off" />
          <TextField {...fieldProps('email')} label="Email address" type="email" autoComplete="off" />
          <TextField {...fieldProps('password')} label="Temporary password" type="password" autoComplete="new-password" />
          <TextField {...fieldProps('role')} select label="Role" helperText={ROLE_NOTES[formik.values.role]}>
            {ROLES.map((role) => (
              <MenuItem key={role} value={role}>{ROLE_LABELS[role]}</MenuItem>
            ))}
          </TextField>
          {error && <Alert severity="error">{error}</Alert>}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={formik.isSubmitting} className="btn-outline">Cancel</button>
          <button type="submit" disabled={formik.isSubmitting} className="btn-primary min-w-[140px]">
            {formik.isSubmitting ? <CircularProgress size={16} color="inherit" /> : 'Add member'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

// Admin only. Lists staff and admins, adds new ones, and promotes or demotes any account.
function AdminTeam() {
  const dispatch = useDispatch()
  const { items: accounts, status, error } = useSelector((state) => state.customers)
  const currentUserId = useSelector((state) => state.auth.user?.id)
  const [params, setParams] = useQueryParams()
  const [adding, setAdding] = useState(false)
  const [change, setChange] = useState(null)
  const [busy, setBusy] = useState(false)

  const filter = FILTERS.find((item) => item.id === (params.get('filter') ?? '')) ?? FILTERS[0]
  const query = params.get('q') ?? ''

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return accounts.filter(filter.test).filter((account) => !term || `${account.name} ${account.email}`.toLowerCase().includes(term))
  }, [accounts, filter, query])

  const loading = accounts.length === 0 && (status === 'idle' || status === 'loading')
  const counts = Object.fromEntries(ROLES.map((role) => [role, accounts.filter((account) => account.role === role).length]))

  const confirmChange = async () => {
    setBusy(true)
    try {
      await dispatch(updateUserRole({ id: change.account.id, role: change.role })).unwrap()
    } catch {
      // The toast listener reports the error
    } finally {
      setBusy(false)
      setChange(null)
    }
  }

  return (
    <>
      <AdminPageHeader
        title="Team"
        description={loading ? 'Loading…' : `${counts.admin} admins · ${counts.staff} staff · ${counts.customer} customers`}
        actions={
          <button type="button" onClick={() => setAdding(true)} className="btn-primary">
            <AddRoundedIcon sx={{ fontSize: 18 }} /> Add team member
          </button>
        }
      />

      <Toolbar>
        <FilterChips
          label="Filter accounts"
          options={FILTERS.map((item) => ({ id: item.id, label: item.label, count: accounts.filter(item.test).length }))}
          value={filter.id}
          onChange={(id) => setParams({ filter: id })}
        />
        <SearchField label="Search accounts" value={query} onChange={(value) => setParams({ q: value })} placeholder="Name or email" />
      </Toolbar>

      {status === 'failed' && <LoadError message={`Could not load accounts: ${error}`} onRetry={() => dispatch(fetchCustomers())} />}

      {loading ? (
        <TableSkeleton />
      ) : visible.length === 0 ? (
        status !== 'failed' && (
          <AdminEmpty
            icon={AdminPanelSettingsOutlinedIcon}
            title="No matching accounts"
            description={filter.id === 'customers' ? 'Search for a customer to promote them.' : 'Try a different filter or search.'}
          />
        )
      ) : (
        <DataTable minWidth={760}>
          <TableHead columns={COLUMNS} />
          <tbody className="divide-y divide-line">
            {visible.map((account) => {
              const self = account.id === currentUserId
              return (
                <tr key={account.id} className="align-middle transition-colors hover:bg-ivory/60">
                  <td className="px-5 py-3">
                    <p className="font-medium">{account.name}{self && <span className="ml-2 text-xs text-stone">(you)</span>}</p>
                    <p className="max-w-[300px] truncate text-xs text-stone">{account.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    <TextField
                      select
                      size="small"
                      value={account.role}
                      disabled={self}
                      onChange={(event) => setChange({ account, role: event.target.value })}
                      slotProps={{ htmlInput: { 'aria-label': `Role for ${account.name}` } }}
                      sx={{ minWidth: 170, '& .MuiOutlinedInput-input': { py: 1 } }}
                      helperText={self ? 'You cannot change your own role' : undefined}
                    >
                      {ROLES.map((role) => (
                        <MenuItem key={role} value={role}>{ROLE_LABELS[role]}</MenuItem>
                      ))}
                    </TextField>
                  </td>
                  <td className="px-5 py-3 text-xs text-stone">{account.emailVerified ? 'Verified' : 'Unverified'}</td>
                  <td className="px-5 py-3 text-xs text-stone">{formatDate(account.createdAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      )}

      <AddMemberDialog open={adding} onClose={() => setAdding(false)} />

      <ConfirmDialog
        open={Boolean(change)}
        title={change ? `Make ${change.account.name} ${ROLE_LABELS[change.role].toLowerCase()}?` : ''}
        description={change ? `${ROLE_NOTES[change.role]}. They will be signed out and get the new access when they sign in again.` : ''}
        confirmLabel="Change role"
        busy={busy}
        onConfirm={confirmChange}
        onClose={() => setChange(null)}
      />
    </>
  )
}

export default AdminTeam
