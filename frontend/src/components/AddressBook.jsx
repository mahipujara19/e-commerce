import { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, Checkbox, CircularProgress, Dialog, FormControlLabel, MenuItem, TextField } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import { useDispatch, useSelector } from 'react-redux'
import { deleteAddress, fetchAddresses, saveAddress } from '../toolkit/addressSlice'
import { COUNTRIES } from '../utils/countries'
import ConfirmDialog from './ConfirmDialog'
import EmptyState from './EmptyState'

const MAX_ADDRESSES = 10

const schema = Yup.object({
  label: Yup.string().trim().max(40, 'Keep the label under 40 characters'),
  fullName: Yup.string().trim().min(2, 'Name must be at least 2 characters').required('Full name is required'),
  phone: Yup.string().trim().matches(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number').required('Phone number is required'),
  address: Yup.string().trim().min(5, 'Please enter the full street address').required('Street address is required'),
  city: Yup.string().trim().required('City is required'),
  state: Yup.string().trim().required('State / Province is required'),
  zipCode: Yup.string().trim().matches(/^[A-Za-z0-9\s-]{3,10}$/, 'Please enter a valid postal code').required('Postal code is required'),
  country: Yup.string().required('Country is required'),
})

const EMPTY = { label: '', fullName: '', phone: '', address: '', city: '', state: '', zipCode: '', country: '', isDefault: false }

const paperSx = { borderRadius: 0, bgcolor: 'rgb(var(--ivory))', backgroundImage: 'none', width: 'calc(100% - 32px)', minWidth: 0, maxWidth: 560, m: 2 }

function AddressDialog({ address, onClose }) {
  const dispatch = useDispatch()
  const [error, setError] = useState('')
  const formik = useFormik({
    initialValues: address ? { ...EMPTY, ...address, label: address.label ?? '' } : EMPTY,
    validationSchema: schema,
    onSubmit: async (values) => {
      setError('')
      try {
        const { id, label, fullName, phone, address: street, city, state, zipCode, country, isDefault } = values
        await dispatch(saveAddress({ id, label, fullName, phone, address: street, city, state, zipCode, country, isDefault })).unwrap()
        onClose()
      } catch (message) {
        setError(message)
      }
    },
  })

  const fieldProps = (name) => {
    const invalid = formik.touched[name] && Boolean(formik.errors[name])
    return {
      id: `address-${name}`,
      name,
      value: formik.values[name],
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: invalid,
      helperText: invalid ? formik.errors[name] : undefined,
    }
  }

  return (
    <Dialog open onClose={formik.isSubmitting ? undefined : onClose} slotProps={{ paper: { sx: paperSx } }} aria-labelledby="address-dialog-title">
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-5 p-7 sm:p-8">
        <h2 id="address-dialog-title" className="font-display text-2xl">{address ? 'Edit address' : 'New address'}</h2>
        <TextField {...fieldProps('label')} label="Label (optional)" placeholder="Home, Work…" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField {...fieldProps('fullName')} label="Full name" autoComplete="name" />
          <TextField {...fieldProps('phone')} label="Phone" type="tel" autoComplete="tel" />
        </div>
        <TextField {...fieldProps('address')} label="Street address and number" autoComplete="street-address" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField {...fieldProps('city')} label="City" autoComplete="address-level2" />
          <TextField {...fieldProps('state')} label="State / Province" autoComplete="address-level1" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField {...fieldProps('zipCode')} label="Postal code" autoComplete="postal-code" />
          <TextField {...fieldProps('country')} label="Country" select>
            {COUNTRIES.map((country) => <MenuItem key={country} value={country}>{country}</MenuItem>)}
          </TextField>
        </div>
        <FormControlLabel
          control={<Checkbox name="isDefault" checked={formik.values.isDefault} onChange={formik.handleChange} size="small" />}
          label={<span className="text-sm">Use as my default delivery address</span>}
        />
        {error && <Alert severity="error">{error}</Alert>}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={formik.isSubmitting} className="btn-outline">Cancel</button>
          <button type="submit" disabled={formik.isSubmitting} className="btn-primary min-w-[160px]">
            {formik.isSubmitting ? <CircularProgress size={16} color="inherit" /> : 'Save address'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function AddressBook() {
  const dispatch = useDispatch()
  const { items, status, error } = useSelector((state) => state.addresses)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    dispatch(fetchAddresses())
  }, [dispatch])

  const setDefault = async (address) => {
    setBusyId(address.id)
    await dispatch(saveAddress({ id: address.id, isDefault: true }))
    setBusyId(null)
  }

  if (status === 'failed' && !items.length) {
    return (
      <Alert severity="error" className="mt-10" action={<button type="button" onClick={() => dispatch(fetchAddresses())} className="px-2 text-sm font-semibold underline">Retry</button>}>
        We couldn&apos;t load your addresses: {error}
      </Alert>
    )
  }

  if (status !== 'succeeded' && !items.length) {
    return <div className="mt-10 grid gap-5 sm:grid-cols-2" aria-busy="true">{[0, 1].map((key) => <div key={key} className="h-40 animate-pulse bg-sand" />)}</div>
  }

  return (
    <div className="mt-10">
      {items.length === 0 ? (
        <EmptyState
          icon={HomeOutlinedIcon}
          title="No saved addresses"
          description="Save an address to check out in seconds next time."
          action={<button type="button" onClick={() => setEditing('new')} className="btn-primary">Add an address</button>}
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((address) => (
            <li key={address.id} className="flex flex-col bg-surface p-6 text-sm ring-1 ring-line">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{address.label || address.fullName}</p>
                {address.isDefault && <span className="bg-gold-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">Default</span>}
              </div>
              <p className="mt-3 leading-relaxed text-stone">
                {address.fullName}<br />
                {address.address}<br />
                {address.city}, {address.state} {address.zipCode}<br />
                {address.country}<br />
                {address.phone}
              </p>
              <div className="mt-auto flex flex-wrap gap-x-5 gap-y-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.14em]">
                <button type="button" onClick={() => setEditing(address)} className="min-h-[32px] underline-offset-4 hover:underline">Edit</button>
                {!address.isDefault && (
                  <button type="button" onClick={() => setDefault(address)} disabled={busyId === address.id} className="min-h-[32px] underline-offset-4 hover:underline disabled:opacity-50">
                    Make default
                  </button>
                )}
                <button type="button" onClick={() => setRemoving(address)} className="min-h-[32px] text-stone underline-offset-4 hover:text-red-700 hover:underline">Remove</button>
              </div>
            </li>
          ))}
          {items.length < MAX_ADDRESSES && (
            <li>
              <button
                type="button"
                onClick={() => setEditing('new')}
                className="flex h-full min-h-[180px] w-full flex-col items-center justify-center gap-2 border border-dashed border-line text-sm font-semibold transition hover:border-ink hover:bg-surface"
              >
                <AddRoundedIcon /> Add an address
              </button>
            </li>
          )}
        </ul>
      )}

      {editing && <AddressDialog address={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove this address?"
        description={removing ? `${removing.address}, ${removing.city}` : ''}
        confirmLabel="Remove"
        onConfirm={() => {
          dispatch(deleteAddress(removing.id))
          setRemoving(null)
        }}
        onClose={() => setRemoving(null)}
      />
    </div>
  )
}

export default AddressBook
