import { matchedData } from 'express-validator'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import User from '../models/User.js'
import { ApiError, sendSuccess } from '../utils/apiResponse.js'
import { issueVerificationEmail } from './authController.js'

// Admin list of every account with its order totals; cancelled orders do not count towards spend.
export const getUsers = async (_req, res, next) => {
  try {
    const [users, stats] = await Promise.all([
      User.find().sort({ createdAt: -1 }),
      Order.aggregate([
        {
          $group: {
            _id: '$user',
            orderCount: { $sum: 1 },
            totalSpent: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$totalAmount'] } },
            lastOrderAt: { $max: '$createdAt' },
          },
        },
      ]),
    ])

    const statsByUser = new Map(stats.map((entry) => [String(entry._id), entry]))
    const data = users.map((user) => {
      const entry = statsByUser.get(user.id)
      return {
        ...user.toJSON(),
        orderCount: entry?.orderCount ?? 0,
        totalSpent: Math.round((entry?.totalSpent ?? 0) * 100) / 100,
        lastOrderAt: entry?.lastOrderAt ?? null,
      }
    })

    sendSuccess(res, { message: 'Users loaded', data })
  } catch (error) {
    next(error)
  }
}

export const getProfile = (req, res) => {
  sendSuccess(res, { message: 'Profile loaded', data: req.user })
}

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = matchedData(req, { locations: ['body'] })

    // An empty phone removes it; email changes are not supported here because they would need re-verification.
    req.user.set({ name, phone: phone || undefined })
    await req.user.save()

    sendSuccess(res, { message: 'Profile updated', data: req.user })
  } catch (error) {
    next(error)
  }
}

export const resendVerification = async (req, res, next) => {
  try {
    if (req.user.emailVerified) throw new ApiError(400, 'Your email address is already verified')

    await issueVerificationEmail(req.user)
    sendSuccess(res, { message: `A new verification link has been sent to ${req.user.email}` })
  } catch (error) {
    next(error)
  }
}

// Deleted products are dropped so the list only holds pieces that can still be shown.
const wishlistIds = async (ids) => {
  const existing = await Product.find({ _id: { $in: ids } }).distinct('_id')
  return existing.map(String)
}

export const getWishlist = async (req, res, next) => {
  try {
    sendSuccess(res, { message: 'Wishlist loaded', data: await wishlistIds(req.user.wishlist) })
  } catch (error) {
    next(error)
  }
}

export const addToWishlist = async (req, res, next) => {
  try {
    if (!(await Product.exists({ _id: req.params.productId }))) throw new ApiError(404, 'Product not found')

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { wishlist: req.params.productId } },
      { returnDocument: 'after' },
    )
    sendSuccess(res, { message: 'Saved to wishlist', data: await wishlistIds(user.wishlist) })
  } catch (error) {
    next(error)
  }
}

export const removeFromWishlist = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: req.params.productId } },
      { returnDocument: 'after' },
    )
    sendSuccess(res, { message: 'Removed from wishlist', data: await wishlistIds(user.wishlist) })
  } catch (error) {
    next(error)
  }
}
