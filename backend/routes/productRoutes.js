import { Router } from 'express'
import { body, param, query } from 'express-validator'
import {
  addReview,
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  getProductStats,
  getProductSuggestions,
  getProductSummary,
  PRODUCT_SORTS,
  STOCK_FILTERS,
  updateProduct,
  updateStock,
} from '../controllers/productController.js'
import { MAX_PRODUCT_PAGE_SIZE } from '../../shared/catalog.js'
import { adminOnly, protect, staffOnly } from '../middleware/authMiddleware.js'
import { validate } from '../middleware/validate.js'

const router = Router()

const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true }
export const MAX_STOCK = 1000000

const idRule = param('id').isMongoId().withMessage('Invalid product id')

// "a,b,c" → ['a', 'b', 'c'], so lists fit in a plain query string.
const commaList = (value) => String(value).split(',').map((item) => item.trim()).filter(Boolean)
const isMongoId = (value) => /^[a-f\d]{24}$/i.test(value)

const listRules = [
  query('category').optional().isString().withMessage('category must be text').trim().isLength({ max: 100 }),
  query('categories').optional().isString().withMessage('categories must be a comma-separated list')
    .customSanitizer(commaList)
    .custom((list) => list.length <= 20 && list.every((item) => item.length <= 100)).withMessage('Send up to 20 categories'),
  query('ids').optional().isString().withMessage('ids must be a comma-separated list')
    .customSanitizer(commaList)
    .custom((list) => list.length <= MAX_PRODUCT_PAGE_SIZE && list.every((id) => isMongoId(id)))
    .withMessage(`ids must be up to ${MAX_PRODUCT_PAGE_SIZE} valid product ids`),
  query('search').optional().isString().withMessage('search must be text').trim().isLength({ max: 100 }),
  query('stock').optional().isIn(STOCK_FILTERS).withMessage(`stock must be one of: ${STOCK_FILTERS.join(', ')}`),
  query('sort').optional().isIn(PRODUCT_SORTS).withMessage(`sort must be one of: ${PRODUCT_SORTS.join(', ')}`),
  query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('page must be a whole number from 1').toInt(),
  query('pageSize').optional().isInt({ min: 1, max: MAX_PRODUCT_PAGE_SIZE })
    .withMessage(`pageSize must be between 1 and ${MAX_PRODUCT_PAGE_SIZE}`).toInt(),
  // Older name for pageSize.
  query('limit').optional().isInt({ min: 1, max: MAX_PRODUCT_PAGE_SIZE })
    .withMessage(`limit must be between 1 and ${MAX_PRODUCT_PAGE_SIZE}`).toInt(),
]

const suggestionRules = [
  query('q').isString().withMessage('Type something to search for').trim()
    .isLength({ min: 1, max: 100 }).withMessage('Search must be between 1 and 100 characters'),
  // Optional: the header's "search in" category.
  query('category').optional().isString().withMessage('category must be text').trim().toLowerCase().isLength({ max: 100 }),
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

// Registered before /:id so these names are not read as product ids.
router.get('/summary', getProductSummary)
router.get('/suggestions', suggestionRules, validate, getProductSuggestions)
router.get('/stats', protect, staffOnly, getProductStats)
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
