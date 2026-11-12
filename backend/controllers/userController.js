import { matchedData } from 'express-validator'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { STAFF_ROLES } from '../config/roles.js'
import User, { MAX_ADDRESSES } from '../models/User.js'
import { ApiError, sendSuccess } from '../utils/apiResponse.js'
import { audit } from '../utils/auditLog.js'
import { issueVerificationEmail, resendVerificationEmail } from './authController.js'

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

// Admin only. Creates a staff, admin or customer account; the person confirms their email like any signup.
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = matchedData(req, { locations: ['body'] })

    if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists')

    const user = await User.create({ name, email, password, role })

    let verificationEmailSent = true
    try {
      await issueVerificationEmail(user)
    } catch (error) {
      verificationEmailSent = false
      console.error(`[email] Verification email failed: ${error.message}`)
    }

    audit(req.user, 'user.create', { targetType: 'user', targetId: user.id, summary: `Added ${user.email} as ${role}` })
    sendSuccess(res, {
      status: 201,
      message: `${user.name} was added as ${role}`,
      data: { ...user.toJSON(), orderCount: 0, totalSpent: 0, lastOrderAt: null, verificationEmailSent },
    })
  } catch (error) {
    next(error)
  }
}

// Admin only. Signs the account out everywhere so the new permissions apply from the next sign-in.
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = matchedData(req, { locations: ['body'] })
    if (req.user._id.equals(req.params.id)) throw new ApiError(400, 'You cannot change your own role')

    const user = await User.findById(req.params.id)
    if (!user) throw new ApiError(404, 'User not found')
    if (!STAFF_ROLES.includes(user.role)) throw new ApiError(400, 'Only admin and staff roles can be changed here')

    // The acting admin is never the target, so at least one admin always remains.
    const previousRole = user.role
    user.role = role
    user.sessions = []
    await user.save()

    audit(req.user, 'user.role', { targetType: 'user', targetId: user.id, summary: `${user.email}: ${previousRole} → ${role}` })
    sendSuccess(res, { message: `${user.name} is now ${role === 'admin' ? 'an admin' : role}`, data: user })
  } catch (error) {
    next(error)
  }
}

export const getProfile = (req, res) => {
  sendSuccess(res, { message: 'Profile loaded', data: req.user })
}

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, marketingOptIn } = matchedData(req, { locations: ['body'] })

    // An empty phone removes it; email changes are not supported here because they would need re-verification.
    req.user.set({ name, phone: phone || undefined })
    if (marketingOptIn !== undefined) req.user.marketingOptIn = marketingOptIn
    await req.user.save()

    sendSuccess(res, { message: 'Profile updated', data: req.user })
  } catch (error) {
    next(error)
  }
}

export const resendVerification = async (req, res, next) => {
  try {
    await resendVerificationEmail(req.user)
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

// ── Saved addresses ──

const addressList = (user) => user.addresses.map((address) => address.toJSON())

// Keeps exactly one default whenever any address exists.
const normalizeDefault = (user, preferredId) => {
  if (!user.addresses.length) return
  const target = (preferredId && user.addresses.id(preferredId)) || user.addresses.find((address) => address.isDefault) || user.addresses[0]
  user.addresses.forEach((address) => {
    address.isDefault = address._id.equals(target._id)
  })
}

const loadAddressOwner = (req) => User.findById(req.user._id)

export const getAddresses = async (req, res, next) => {
  try {
    sendSuccess(res, { message: 'Addresses loaded', data: addressList(await loadAddressOwner(req)) })
  } catch (error) {
    next(error)
  }
}

export const addAddress = async (req, res, next) => {
  try {
    const user = await loadAddressOwner(req)
    if (user.addresses.length >= MAX_ADDRESSES) throw new ApiError(400, `You can save up to ${MAX_ADDRESSES} addresses`)
    const fields = matchedData(req, { locations: ['body'] })
    const added = user.addresses.create(fields)
    user.addresses.push(added)
    normalizeDefault(user, fields.isDefault || user.addresses.length === 1 ? added._id : null)
    await user.save()
    sendSuccess(res, { status: 201, message: 'Address saved', data: addressList(user) })
  } catch (error) {
    next(error)
  }
}

export const updateAddress = async (req, res, next) => {
  try {
    const user = await loadAddressOwner(req)
    const address = user.addresses.id(req.params.addressId)
    if (!address) throw new ApiError(404, 'Address not found')
    const fields = matchedData(req, { locations: ['body'] })
    address.set(fields)
    normalizeDefault(user, fields.isDefault ? address._id : null)
    await user.save()
    sendSuccess(res, { message: 'Address updated', data: addressList(user) })
  } catch (error) {
    next(error)
  }
}

export const deleteAddress = async (req, res, next) => {
  try {
    const user = await loadAddressOwner(req)
    const address = user.addresses.id(req.params.addressId)
    if (!address) throw new ApiError(404, 'Address not found')
    address.deleteOne()
    normalizeDefault(user)
    await user.save()
    sendSuccess(res, { message: 'Address removed', data: addressList(user) })
  } catch (error) {
    next(error)
  }
}
