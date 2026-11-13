import { Router } from 'express'
import { body, param } from 'express-validator'
import { STAFF_ROLES } from '../config/roles.js'
import {
  addAddress,
  addToWishlist,
  createUser,
  deleteAddress,
  getAddresses,
  getProfile,
  getUsers,
  getWishlist,
  removeFromWishlist,
  resendVerification,
  updateAddress,
  updatePreferences,
  updateProfile,
  updateUserRole,
} from '../controllers/userController.js'
import { adminOnly, protect, staffOnly } from '../middleware/authMiddleware.js'
import { byIp, byUser, limitRequests } from '../middleware/rateLimit.js'
import { countryRule, currencyRule } from '../utils/localeRules.js'
import { validate } from '../middleware/validate.js'
import { limiters } from '../utils/limiters.js'
import { emailRule, nameRule, passwordRule, phoneRule } from './authRoutes.js'

const router = Router()

const productIdRule = param('productId').isMongoId().withMessage('Invalid product id')

// Team management only deals with admin and staff; customers sign up themselves and are never promoted here.
const roleRule = () => body('role').isIn(STAFF_ROLES).withMessage(`Role must be one of: ${STAFF_ROLES.join(', ')}`)

router.use(protect)

router
  .route('/')
  .get(staffOnly, getUsers)
  .post(adminOnly, [nameRule(), emailRule(), passwordRule(), roleRule()], validate, createUser)

router.patch('/:id/role', adminOnly, [param('id').isMongoId().withMessage('Invalid user id'), roleRule()], validate, updateUserRole)

// Country and display currency, e.g. from the currency switcher. Both optional; each is checked against the lists.
router.patch('/me/preferences', [countryRule({ optional: true }), currencyRule()], validate, updatePreferences)
router.route('/me').get(getProfile).put([nameRule(), phoneRule(), body('marketingOptIn').optional().isBoolean().toBoolean()], validate, updateProfile)
// On top of the one-minute cooldown in the controller: caps emails per account and per IP over an hour.
const RESEND_LIMIT_MESSAGE = 'Too many verification emails requested. Please try again later.'
router.post(
  '/me/verification',
  limitRequests({ limiter: limiters.resendVerificationIp, key: byIp, name: 'resendVerificationIp', message: RESEND_LIMIT_MESSAGE }),
  limitRequests({ limiter: limiters.resendVerificationUser, key: byUser, name: 'resendVerificationUser', message: RESEND_LIMIT_MESSAGE }),
  resendVerification,
)

router.get('/me/wishlist', getWishlist)
router
  .route('/me/wishlist/:productId')
  .put(productIdRule, validate, addToWishlist)
  .delete(productIdRule, validate, removeFromWishlist)

const addressRules = ({ partial }) => {
  const field = (name, label, max = 200) =>
    (partial ? body(name).optional() : body(name))
      .isString().withMessage(`${label} is required`).trim()
      .isLength({ min: 1, max }).withMessage(`${label} is required`)
  return [
    body('label').optional().isString().trim().isLength({ max: 40 }).withMessage('Label is too long'),
    field('fullName', 'Full name'),
    field('phone', 'Phone number', 20).matches(/^\+?[\d\s\-()]{7,20}$/).withMessage('Please enter a valid phone number'),
    field('address', 'Street address'),
    field('city', 'City'),
    field('state', 'State / Province'),
    field('zipCode', 'Postal code', 20).matches(/^[A-Za-z0-9\s-]{3,10}$/).withMessage('Please enter a valid postal code'),
    field('country', 'Country', 100),
    body('isDefault').optional().isBoolean().toBoolean(),
  ]
}

const addressIdRule = param('addressId').isMongoId().withMessage('Invalid address id')

router.route('/me/addresses').get(getAddresses).post(addressRules({ partial: false }), validate, addAddress)
router
  .route('/me/addresses/:addressId')
  .put(addressIdRule, addressRules({ partial: true }), validate, updateAddress)
  .delete(addressIdRule, validate, deleteAddress)

export default router
