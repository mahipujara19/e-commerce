import { Router } from 'express'
import { body, param, query } from 'express-validator'
import {
  addReview,
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  PRODUCT_SORTS,
  updateProduct,
  updateStock,
} from '../controllers/productController.js'
import { adminOnly, protect, staffOnly } from '../middleware/authMiddleware.js'
import { validate } from '../middleware/validate.js'

const router = Router()

const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true }
export const MAX_STOCK = 1000000

const idRule = param('id').isMongoId().withMessage('Invalid product id')

const listRules = [
  query('category').optional().isString().withMessage('category must be text').trim().isLength({ max: 100 }),
  query('search').optional().isString().withMessage('search must be text').trim().isLength({ max: 100 }),
  query('sort').optional().isIn(PRODUCT_SORTS).withMessage(`sort must be one of: ${PRODUCT_SORTS.join(', ')}`),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('limit must be between 1 and 1000').toInt(),
]

// On update every field is optional, but anything supplied must still be valid.
const productRules = ({ partial }) => {
  const required = (name) => (partial ? body(name).optional() : body(name))

  return [
    required('name').isString().withMessage('Name is required').trim()
      .isLength({ min: 2, max: 200 }).withMessage('Name must be between 2 and 200 characters'),
    required('description').isString().withMessage('Description is required').trim()
      .isLength({ min: 1, max: 5000 }).withMessage('Description must be between 1 and 5000 characters'),
    required('price').isFloat({ min: 0.01, max: 10000000 }).withMessage('Price must be a positive number').toFloat(),
    required('category').isString().withMessage('Category is required').trim().toLowerCase()
      .isLength({ min: 2, max: 100 }).withMessage('Category must be between 2 and 100 characters'),
    required('image').isString().withMessage('Image URL is required').trim()
      .isURL(URL_OPTIONS).withMessage('Image must be a valid URL'),
    required('stock').isInt({ min: 0, max: MAX_STOCK }).withMessage(`Stock must be a whole number from 0 to ${MAX_STOCK}`).toInt(),
    body('images').optional().isArray({ max: 20 }).withMessage('Images must be a list of up to 20 URLs'),
    body('images.*').isString().isURL(URL_OPTIONS).withMessage('Each image must be a valid URL'),
    body('brand').optional().isString().trim().isLength({ max: 100 }).withMessage('Brand is too long'),
    body('sku').optional().isString().trim().isLength({ max: 100 }).withMessage('SKU is too long'),
    body('discountPercentage').optional().isFloat({ min: 0, max: 100 })
      .withMessage('Discount must be between 0 and 100').toFloat(),
  ]
}

const stockRules = [
  body('updates').isArray({ min: 1, max: 100 }).withMessage('Send between 1 and 100 stock updates'),
  body('updates.*.id').isMongoId().withMessage('Invalid product id'),
  body('updates.*.stock').isInt({ min: 0, max: MAX_STOCK })
    .withMessage(`Stock must be a whole number from 0 to ${MAX_STOCK}`).toInt(),
]

router
  .route('/')
  .get(listRules, validate, getProducts)
  .post(protect, adminOnly, productRules({ partial: false }), validate, createProduct)

// Registered before /:id so "stock" is not read as a product id.
router.patch('/stock', protect, staffOnly, stockRules, validate, updateStock)

router
  .route('/:id')
  .get(idRule, validate, getProduct)
  .put(protect, adminOnly, idRule, productRules({ partial: true }), validate, updateProduct)
  .delete(protect, adminOnly, idRule, validate, deleteProduct)

const reviewRules = [
  idRule,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Please choose a rating from 1 to 5').toInt(),
  body('comment').isString().withMessage('Please write a short review').trim()
    .isLength({ min: 3, max: 1000 }).withMessage('Reviews must be between 3 and 1000 characters'),
]

router.post('/:id/reviews', protect, reviewRules, validate, addReview)

export default router
