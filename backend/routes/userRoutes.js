import { Router } from 'express'
import { body, param } from 'express-validator'
import { ROLES } from '../config/roles.js'
import {
  addToWishlist,
  createUser,
  getProfile,
  getUsers,
  getWishlist,
  removeFromWishlist,
  resendVerification,
  updateProfile,
  updateUserRole,
} from '../controllers/userController.js'
import { adminOnly, protect, staffOnly } from '../middleware/authMiddleware.js'
import { validate } from '../middleware/validate.js'
import { emailRule, nameRule, passwordRule, phoneRule } from './authRoutes.js'

const router = Router()

const productIdRule = param('productId').isMongoId().withMessage('Invalid product id')

const roleRule = () => body('role').isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`)

router.use(protect)

router
  .route('/')
  .get(staffOnly, getUsers)
  .post(adminOnly, [nameRule(), emailRule(), passwordRule(), roleRule()], validate, createUser)

router.patch('/:id/role', adminOnly, [param('id').isMongoId().withMessage('Invalid user id'), roleRule()], validate, updateUserRole)

router.route('/me').get(getProfile).put([nameRule(), phoneRule()], validate, updateProfile)
router.post('/me/verification', resendVerification)

router.get('/me/wishlist', getWishlist)
router
  .route('/me/wishlist/:productId')
  .put(productIdRule, validate, addToWishlist)
  .delete(productIdRule, validate, removeFromWishlist)

export default router
