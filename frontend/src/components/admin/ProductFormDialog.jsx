import { useState } from 'react'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { Alert, Autocomplete, CircularProgress, Dialog, IconButton, InputAdornment, TextField } from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { useDispatch } from 'react-redux'
import { createProduct, updateProduct } from '../../toolkit/productSlice'

const paperSx = { borderRadius: 0, bgcolor: 'rgb(var(--ivory))', backgroundImage: 'none', width: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 48px)' }, minWidth: 0, maxWidth: 760, m: { xs: 1, sm: 3 } }

const url = () => Yup.string().trim().url('Please enter a full URL starting with https://')

// Mirrors the server's product rules so most mistakes are caught before submitting.
const productSchema = Yup.object({
  name: Yup.string().trim().min(2, 'Name must be at least 2 characters').max(200).required('Name is required'),
  brand: Yup.string().trim().max(100),
  category: Yup.string().trim().min(2, 'Category must be at least 2 characters').max(100).required('Category is required'),
  price: Yup.number().typeError('Price must be a number').min(0.01, 'Price must be above zero').required('Price is required'),
  discountPercentage: Yup.number().typeError('Discount must be a number').min(0).max(100, 'Discount cannot exceed 100%'),
  stock: Yup.number().typeError('Stock must be a number').integer('Stock must be a whole number').min(0).max(1000000, 'Stock cannot exceed 1,000,000').required('Stock is required'),
  sku: Yup.string().trim().max(100),
  image: url().required('A main image URL is required'),
  images: Yup.string().test('urls', 'Each line must be a full image URL', (value = '') =>
    value.split('\n').map((line) => line.trim()).filter(Boolean).every((line) => /^https?:\/\/\S+$/i.test(line)),
  ),
  description: Yup.string().trim().max(5000).required('Description is required'),
})

const toFormValues = (product) => ({
  name: product?.title ?? '',
  brand: product?.brand ?? '',
  category: product?.category ?? '',
  price: product?.price ?? '',
  discountPercentage: product?.discountPercentage ? Number(product.discountPercentage.toFixed(2)) : '',
  stock: product?.stock ?? 0,
  sku: product?.sku ?? '',
  image: product?.thumbnail ?? '',
  images: product?.images?.join('\n') ?? '',
  description: product?.description ?? '',
})

const toApiFields = (values) => ({
  name: values.name.trim(),
  brand: values.brand.trim(),
  category: values.category.trim(),
  price: Number(values.price),
  discountPercentage: Number(values.discountPercentage) || 0,
  stock: Number(values.stock),
  sku: values.sku.trim(),
  image: values.image.trim(),
  images: values.images.split('\n').map((line) => line.trim()).filter(Boolean),
  description: values.description.trim(),
})

function ProductForm({ product, categories, onClose }) {
  const dispatch = useDispatch()
  const [saveError, setSaveError] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const editing = Boolean(product)

  const formik = useFormik({
    initialValues: toFormValues(product),
    validationSchema: productSchema,
    onSubmit: async (values) => {
      setSaveError('')
      try {
        const fields = toApiFields(values)
        await dispatch(editing ? updateProduct({ id: product.id, changes: fields }) : createProduct(fields)).unwrap()
        onClose()
      } catch (message) {
        setSaveError(message)
      }
    },
  })

  const fieldProps = (name) => {
    const invalid = formik.touched[name] && Boolean(formik.errors[name])
    return {
      id: `product-${name}`,
      name,
      value: formik.values[name],
      onChange: formik.handleChange,
      onBlur: formik.handleBlur,
      error: invalid,
      helperText: invalid ? formik.errors[name] : undefined,
    }
  }

  const categoryInvalid = formik.touched.category && Boolean(formik.errors.category)

  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <div className="flex items-center justify-between border-b border-line px-6 py-5 sm:px-8">
        <h2 id="product-form-title" className="font-display text-2xl">{editing ? 'Edit product' : 'Add a product'}</h2>
        <IconButton onClick={onClose} aria-label="Close" edge="end" disabled={formik.isSubmitting}>
          <CloseRoundedIcon />
        </IconButton>
      </div>

      <div className="max-h-[70svh] space-y-5 overflow-y-auto px-6 py-7 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-[1fr_120px]">
          <div className="space-y-5">
            <TextField {...fieldProps('name')} label="Product name" />
            <TextField
              {...fieldProps('image')}
              onChange={(event) => {
                setPreviewFailed(false)
                formik.handleChange(event)
              }}
              label="Main image URL"
              placeholder="https://"
            />
          </div>
          <div className="grid aspect-square place-items-center bg-sand p-2 sm:h-[120px]" aria-hidden="true">
            {formik.values.image && !previewFailed ? (
              <img src={formik.values.image} alt="" onError={() => setPreviewFailed(true)} className="h-full w-full object-contain" />
            ) : (
              <ImageOutlinedIcon className="text-stone" />
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField {...fieldProps('brand')} label="Brand (optional)" />
          <Autocomplete
            freeSolo
            options={categories}
            value={formik.values.category}
            onInputChange={(_, value) => formik.setFieldValue('category', value)}
            renderInput={(params) => (
              <TextField
                {...params}
                id="product-category"
                name="category"
                label="Category"
                onBlur={formik.handleBlur}
                error={categoryInvalid}
                helperText={categoryInvalid ? formik.errors.category : 'Pick one or type a new category'}
              />
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            {...fieldProps('price')}
            label="Price"
            type="number"
            slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 0, step: '0.01' } }}
          />
          <TextField
            {...fieldProps('discountPercentage')}
            label="Discount (optional)"
            type="number"
            slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> }, htmlInput: { min: 0, max: 100, step: '0.1' } }}
          />
          <TextField {...fieldProps('stock')} label="Stock" type="number" slotProps={{ htmlInput: { min: 0, step: 1 } }} />
        </div>

        <TextField {...fieldProps('sku')} label="SKU (optional)" />
        <TextField
          {...fieldProps('images')}
          label="Gallery image URLs (optional)"
          multiline
          minRows={2}
          helperText={formik.touched.images && formik.errors.images ? formik.errors.images : 'One URL per line'}
        />
        <TextField {...fieldProps('description')} label="Description" multiline minRows={4} />

        {saveError && <Alert severity="error">{saveError}</Alert>}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-line px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
        <button type="button" onClick={onClose} disabled={formik.isSubmitting} className="btn-outline">Cancel</button>
        <button type="submit" disabled={formik.isSubmitting} className="btn-primary min-w-[180px]">
          {formik.isSubmitting ? <CircularProgress size={18} color="inherit" /> : editing ? 'Save changes' : 'Add product'}
        </button>
      </div>
    </form>
  )
}

// The form is remounted for each product so its initial values always match what is being edited.
function ProductFormDialog({ open, product, categories, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} slotProps={{ paper: { sx: paperSx } }} aria-labelledby="product-form-title">
      {open && <ProductForm key={product?.id ?? 'new'} product={product} categories={categories} onClose={onClose} />}
    </Dialog>
  )
}

export default ProductFormDialog
