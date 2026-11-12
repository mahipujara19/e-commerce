import { matchedData } from 'express-validator'
import AuditLog from '../models/AuditLog.js'
import Coupon from '../models/Coupon.js'
import { ApiError, sendSuccess } from '../utils/apiResponse.js'
import { audit } from '../utils/auditLog.js'
import { formatMoney } from '../utils/money.js'

// ── Coupons (admin) ──

const describe = (coupon) =>
  `${coupon.code}: ${coupon.type === 'percent' ? `${coupon.value}% off` : `${formatMoney(coupon.value)} off`}${coupon.active ? '' : ' (inactive)'}`

export const getCoupons = async (_req, res, next) => {
  try {
    sendSuccess(res, { message: 'Coupons loaded', data: await Coupon.find().sort({ createdAt: -1 }) })
  } catch (error) {
    next(error)
  }
}

export const createCoupon = async (req, res, next) => {
  try {
    const fields = matchedData(req, { locations: ['body'] })
    if (await Coupon.exists({ code: fields.code.toUpperCase() })) throw new ApiError(409, 'A coupon with this code already exists')
    const coupon = await Coupon.create(fields)
    audit(req.user, 'coupon.create', { targetType: 'coupon', targetId: coupon.id, summary: `Created ${describe(coupon)}`, details: fields })
    sendSuccess(res, { status: 201, message: `Coupon ${coupon.code} created`, data: coupon })
  } catch (error) {
    next(error)
  }
}

export const updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
    if (!coupon) throw new ApiError(404, 'Coupon not found')
    const fields = matchedData(req, { locations: ['body'] })
    coupon.set(fields)
    // An empty limit or expiry from the form means "none".
    if (fields.maxUses === null) coupon.maxUses = undefined
    if (fields.expiresAt === null) coupon.expiresAt = undefined
    await coupon.save()
    audit(req.user, 'coupon.update', { targetType: 'coupon', targetId: coupon.id, summary: `Updated ${describe(coupon)}`, details: fields })
    sendSuccess(res, { message: `Coupon ${coupon.code} updated`, data: coupon })
  } catch (error) {
    next(error)
  }
}

export const deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id)
    if (!coupon) throw new ApiError(404, 'Coupon not found')
    audit(req.user, 'coupon.delete', { targetType: 'coupon', targetId: coupon.id, summary: `Deleted ${coupon.code}` })
    sendSuccess(res, { message: `Coupon ${coupon.code} deleted` })
  } catch (error) {
    next(error)
  }
}

// ── Activity log (admin) ──

export const getAuditLogs = async (req, res, next) => {
  try {
    const { action, limit = 200 } = matchedData(req, { locations: ['query'] })
    const filter = action ? { action: new RegExp(`^${action.replace(/[^a-z.]/g, '')}`) } : {}
    sendSuccess(res, { message: 'Activity loaded', data: await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit) })
  } catch (error) {
    next(error)
  }
}
