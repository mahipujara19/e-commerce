import { env } from '../config/env.js'
import User from '../models/User.js'
import { sendStockUpdateEmail } from './sendEmail.js'

const recipients = async () => {
  if (env.stockAlertEmails.length) return env.stockAlertEmails
  return User.find({ role: 'admin' }).distinct('email')
}

/**
 * Emails the configured addresses (or every admin) about stock changes that were already saved.
 * Never throws: a failed email must not undo or fail the stock update, so errors are only logged.
 * changes: [{ name, sku, previous, updated }]
 */
export const notifyStockChanges = async ({ changes, updatedBy }) => {
  if (!changes.length) return

  try {
    const to = await recipients()
    if (!to.length) {
      console.warn('[stock] No admin email or STOCK_ALERT_EMAILS configured; skipping stock notification')
      return
    }
    await sendStockUpdateEmail({ to, changes, updatedBy, updatedAt: new Date() })
  } catch (error) {
    console.error(`[stock] Stock notification failed: ${error.message}`)
  }
}
