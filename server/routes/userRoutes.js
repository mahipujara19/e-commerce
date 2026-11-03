import { Router } from 'express'
import { param } from 'express-validator'
import {
  addToWishlist,
  getProfile,
  getUsers,
  getWishlist,
  removeFromWishlist,
  resendVerification,
  updateProfile,
} from '../controllers/userController.js'
import { authorize, protect } from '../middleware/authMiddleware.js'
import { validate } from '../middleware/validate.js'
import { nameRule, phoneRule } from './authRoutes.js'

const router = Router()

const productIdRule = param('productId').isMongoId().withMessage('Invalid product id')

router.use(protect)

router.get('/', authorize('admin'), getUsers)

router.route('/me').get(getProfile).put([nameRule(), phoneRule()], validate, updateProfile)
router.post('/me/verification', resendVerification)

router.get('/me/wishlist', getWishlist)
router
  .route('/me/wishlist/:productId')
  .put(productIdRule, validate, addToWishlist)
  .delete(productIdRule, validate, removeFromWishlist)

export default router
