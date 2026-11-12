import mongoose from 'mongoose'
import { jsonOptions } from '../utils/jsonTransform.js'

export const COUPON_TYPES = ['percent', 'fixed']

// Promo codes, managed by admins. Codes are stored uppercase so customers can type them in any case.
const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    description: { type: String, trim: true, maxlength: 200 },
    type: { type: String, enum: COUPON_TYPES, required: true },
    // percent: 1–100. fixed: an amount in the store currency.
    value: { type: Number, required: true, min: 0.01 },
    minSubtotal: { type: Number, default: 0, min: 0 },
    // Empty means unlimited.
    maxUses: { type: Number, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: Date,
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: jsonOptions() },
)

export default mongoose.model('Coupon', couponSchema)
