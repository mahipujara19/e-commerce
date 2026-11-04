import User from '../models/User.js'

// Idempotent fixes for data written by earlier versions; safe to run on every start.
export const runMigrations = async () => {
  // The "user" role was renamed to "customer" when staff accounts were added.
  const roles = await User.collection.updateMany({ role: 'user' }, { $set: { role: 'customer' } })
  // A single refreshToken field was replaced by one entry per device in `sessions`.
  const tokens = await User.collection.updateMany({ refreshToken: { $exists: true } }, { $unset: { refreshToken: '' } })

  if (roles.modifiedCount) console.log(`[migrate] Renamed role "user" to "customer" for ${roles.modifiedCount} accounts`)
  if (tokens.modifiedCount) console.log(`[migrate] Cleared ${tokens.modifiedCount} legacy refresh tokens; those users sign in again`)
}
