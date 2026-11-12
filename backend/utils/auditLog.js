import AuditLog from '../models/AuditLog.js'
import { logSecurityEvent } from './securityLog.js'

/**
 * Records an admin or staff change, both in MongoDB (shown under Admin → Activity) and in the server log.
 * Never throws: a failed audit write is logged but must not undo or fail the change itself.
 */
export const audit = async (user, action, { targetType, targetId, summary, details } = {}) => {
  logSecurityEvent('admin_action', { action, userId: user?.id, email: user?.email, targetType, targetId: targetId && String(targetId) })
  try {
    await AuditLog.create({
      actor: user?._id,
      actorName: user?.name,
      actorEmail: user?.email,
      action,
      targetType,
      targetId: targetId && String(targetId),
      summary,
      details,
    })
  } catch (error) {
    console.error(`[audit] Could not record ${action}: ${error.message}`)
  }
}
