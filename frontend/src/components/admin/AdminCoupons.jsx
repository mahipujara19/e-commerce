import { useEffect, useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, CircularProgress, Dialog, MenuItem, Switch, TextField } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import { useDispatch, useSelector } from 'react-redux'
import { createCoupon, deleteCoupon, fetchCoupons, updateCoupon } from '../../toolkit/couponSlice'
import { CURRENCY, formatDate, money } from '../../utils/format'
import ConfirmDialog from '../ConfirmDialog'
import { AdminEmpty, AdminPageHeader, DataTable, LoadError, TableHead, TableSkeleton } from './AdminUI'

const COLUMNS = [
  { label: 'Code' },
  { label: 'Discount' },
  { label: 'Minimum', align: 'right' },
  { label: 'Used', align: 'right' },
  { label: 'Expires' },
  { label: 'Active' },
  { label: 'Actions', hidden: true },
]

const schema = Yup.object({
  code: Yup.string().trim().matches(/^[A-Za-z0-9_-]{3,40}$/, '3–40 letters, numbers, - or _').required('Code is required'),
  type: Yup.string().oneOf(['percent', 'fixed']).required(),
  value: Yup.number().typeError('Enter a number').positive('Must be more than 0').required('Value is required')
    .when('type', { is: 'percent', then: (rule) => rule.max(100, 'A percentage cannot exceed 100') }),
  minSubtotal: Yup.number().typeError('Enter a number').min(0, 'Cannot be negative'),
  maxUses: Yup.number().typeError('Enter a whole number').integer('Enter a whole number').min(1, 'At least 1').nullable(),
  description: Yup.string().max(200),
})

const paperSx = { borderRadius: 0, bgcolor: 'rgb(var(--ivory))', backgroundImage: 'none', width: 'calc(100% - 32px)', minWidth: 0, maxWidth: 520, m: 2 }

const describe = (coupon) => (coupon.type === 'percent' ? `${coupon.value}% off` : `${money(coupon.value)} off`)

const statusOf = (coupon) => {
  if (!coupon.active) return 'Inactive'
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= new Date()) return 'Expired'
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) return 'Used up'
  return null
}

function CouponDialog({ coupon, onClose }) {
  const dispatch = useDispatch()
  const [error, setError] = useState('')
  const formik = useFormik({
    initialValues: {
      code: coupon?.code ?? '',
      type: coupon?.type ?? 'percent',
      value: coupon?.value ?? '',
      minSubtotal: coupon?.minSubtotal ?? 0,
      maxUses: coupon?.maxUses ?? '',
      expiresAt: coupon?.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
      description: coupon?.description ?? '',
    },
    validationSchema: schema,
    onSubmit: async (values) => {
      setError('')
      const fields = {
        code: values.code.trim().toUpperCase(),
        type: values.type,
        value: Number(values.value),
        minSubtotal: Number(values.minSubtotal) || 0,
        maxUses: values.maxUses === '' ? null : Number(values.maxUses),
        // End of the chosen day, so a code "expiring 31 Dec" still works on 31 Dec.
        expiresAt: values.expiresAt ? new Date(`${values.expiresAt}T23:59:59`).toISOString() : null,
        description: values.description.trim(),
      }
      try {
        await dispatch(coupon ? updateCoupon({ id: coupon.id, ...fields }) : createCoupon(fields)).unwrap()
        onClose()
      } catch (message) {
        setError(message)
      }
    },
  })

  const fieldProps = (name) => {
    const invalid = formik.touched[name] && Boolean(formik.errors[name])
    return {
      id: `coupon-${name}`,
      name,
      value: formik.values[name],
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: invalid,
      helperText: invalid ? formik.errors[name] : undefined,
    }
  }

  return (
    <Dialog open onClose={formik.isSubmitting ? undefined : onClose} slotProps={{ paper: { sx: paperSx } }} aria-labelledby="coupon-dialog-title">
      <form onSubmit={formik.handleSubmit} noValidate className="space-y-5 p-7 sm:p-8">
        <h2 id="coupon-dialog-title" className="font-display text-2xl">{coupon ? `Edit ${coupon.code}` : 'New coupon'}</h2>
        <TextField {...fieldProps('code')} label="Code" placeholder="WELCOME10" slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField {...fieldProps('type')} label="Type" select>
            <MenuItem value="percent">Percentage off</MenuItem>
            <MenuItem value="fixed">Fixed amount off</MenuItem>
          </TextField>
          <TextField {...fieldProps('value')} label={formik.values.type === 'percent' ? 'Percent' : `Amount (${CURRENCY})`} type="number" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField {...fieldProps('minSubtotal')} label={`Minimum subtotal (${CURRENCY})`} type="number" />
          <TextField {...fieldProps('maxUses')} label="Usage limit (blank = unlimited)" type="number" />
        </div>
        <TextField {...fieldProps('expiresAt')} label="Expires on (optional)" type="date" slotProps={{ inputLabel: { shrink: true } }} />
        <TextField {...fieldProps('description')} label="Shown to customers (optional)" placeholder="10% off your first order" />
        {error && <Alert severity="error">{error}</Alert>}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={formik.isSubmitting} className="btn-outline">Cancel</button>
          <button type="submit" disabled={formik.isSubmitting} className="btn-primary min-w-[160px]">
            {formik.isSubmitting ? <CircularProgress size={16} color="inherit" /> : coupon ? 'Save changes' : 'Create coupon'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function AdminCoupons() {
  const dispatch = useDispatch()
  const { items, status, error } = useSelector((state) => state.coupons)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  useEffect(() => {
    dispatch(fetchCoupons())
  }, [dispatch])

  const toggle = async (coupon) => {
    setTogglingId(coupon.id)
    await dispatch(updateCoupon({ id: coupon.id, active: !coupon.active }))
    setTogglingId(null)
  }

  const loading = items.length === 0 && (status === 'idle' || status === 'loading')
  const newButton = (
    <button type="button" onClick={() => setEditing('new')} className="btn-primary !py-2.5">
      <AddRoundedIcon sx={{ fontSize: 18 }} /> New coupon
    </button>
  )

  return (
    <>
      <AdminPageHeader
        title="Coupons"
        description="Promo codes customers enter at checkout. One code per order; the server checks every rule."
        actions={newButton}
      />

      {status === 'failed' && <LoadError message={`Could not load coupons: ${error}`} onRetry={() => dispatch(fetchCoupons())} />}

      {loading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        status !== 'failed' && (
          <AdminEmpty icon={LocalOfferOutlinedIcon} title="No coupons yet" description="Create a code to run a promotion." action={newButton} />
        )
      ) : (
        <DataTable minWidth={820}>
          <TableHead columns={COLUMNS} />
          <tbody className="divide-y divide-line">
            {items.map((coupon) => {
              const note = statusOf(coupon)
              return (
                <tr key={coupon.id} className="align-middle hover:bg-ivory/60">
                  <td className="px-5 py-4">
                    <p className="font-mono font-semibold tracking-wider">{coupon.code}</p>
                    {coupon.description && <p className="max-w-[240px] truncate text-xs text-stone">{coupon.description}</p>}
                  </td>
                  <td className="px-5 py-4">{describe(coupon)}</td>
                  <td className="px-5 py-4 text-right tabular-nums">{coupon.minSubtotal ? money(coupon.minSubtotal) : '—'}</td>
                  <td className="px-5 py-4 text-right tabular-nums">{coupon.usedCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : ''}</td>
                  <td className="px-5 py-4 text-sm">{coupon.expiresAt ? formatDate(coupon.expiresAt) : 'Never'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={coupon.active}
                        onChange={() => toggle(coupon)}
                        disabled={togglingId === coupon.id}
                        size="small"
                        slotProps={{ input: { 'aria-label': `${coupon.active ? 'Deactivate' : 'Activate'} ${coupon.code}` } }}
                      />
                      {note && <span className="text-xs text-stone">{note}</span>}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.14em]">
                    <button type="button" onClick={() => setEditing(coupon)} className="mr-4 underline-offset-4 hover:underline">Edit</button>
                    <button type="button" onClick={() => setRemoving(coupon)} className="text-stone underline-offset-4 hover:text-red-700 hover:underline">Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      )}

      {editing && <CouponDialog coupon={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={Boolean(removing)}
        title={removing ? `Delete ${removing.code}?` : ''}
        description="Customers will no longer be able to use this code. Orders that already used it are not affected. To pause a code instead, switch it off."
        confirmLabel="Delete coupon"
        onConfirm={() => {
          dispatch(deleteCoupon(removing.id))
          setRemoving(null)
        }}
        onClose={() => setRemoving(null)}
      />
    </>
  )
}

export default AdminCoupons
