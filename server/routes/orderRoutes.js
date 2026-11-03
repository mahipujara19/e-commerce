import { Router } from 'express'
import { body, param } from 'express-validator'
import { createOrder, getAllOrders, getOrder, getOrders, updateOrderStatus } from '../controllers/orderController.js'
import { authorize, protect } from '../middleware/authMiddleware.js'
import { validate } from '../middleware/validate.js'
import { ORDER_STATUSES } from '../models/Order.js'

const router = Router()

const idRule = param('id').isMongoId().withMessage('Invalid order id')

const addressField = (name, label) =>
  body(`shippingAddress.${name}`)
    .isString().withMessage(`${label} is required`)
    .trim()
    .isLength({ min: 1, max: 200 }).withMessage(`${label} is required`)

const createRules = [
  body('items').isArray({ min: 1, max: 100 }).withMessage('An order needs at least one item'),
  body('items.*.product').isString().isMongoId().withMessage('Invalid product id'),
  body('items.*.quantity').isInt({ min: 1, max: 1000 }).withMessage('Quantity must be between 1 and 1000').toInt(),
  addressField('fullName', 'Full name'),
  body('shippingAddress.email').isString().trim().isEmail().withMessage('Please enter a valid email'),
  addressField('address', 'Street address'),
  addressField('city', 'City'),
  addressField('state', 'State / Province'),
  addressField('zipCode', 'Postal code'),
  addressField('country', 'Country'),
]

const statusRules = [
  idRule,
  body('status').isIn(ORDER_STATUSES).withMessage(`Status must be one of: ${ORDER_STATUSES.join(', ')}`),
]

router.use(protect)

router.route('/').get(getOrders).post(createRules, validate, createOrder)

// Registered before /:id so "all" is not read as an order id.
router.get('/all', authorize('admin'), getAllOrders)

router
  .route('/:id')
  .get(idRule, validate, getOrder)
  .put(authorize('admin'), statusRules, validate, updateOrderStatus)

export default router
