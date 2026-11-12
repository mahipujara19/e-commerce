import mongoose from 'mongoose'
import { jsonOptions } from '../utils/jsonTransform.js'

const RETENTION_SECONDS = 365 * 24 * 60 * 60

// Who changed what in the admin area: stock, prices, products, roles, orders, coupons.
// Kept for a year, then removed by MongoDB.
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: String,
    actorEmail: String,
    action: { type: String, required: true, index: true },
    targetType: String,
    targetId: String,
    summary: { type: String, required: true },
    details: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now, expires: RETENTION_SECONDS },
  },
  { versionKey: false, toJSON: jsonOptions() },
)

auditLogSchema.index({ createdAt: -1 })

export default mongoose.model('AuditLog', auditLogSchema)
