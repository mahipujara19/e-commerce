import { ROLES } from '../config/roles.js'
import User from '../models/User.js'

// Shared by seed.js and createUser.js. Accounts made here are trusted, so they skip email verification.
// resetPassword (createUser.js only): also sets the given password on an existing account, e.g. a forgotten admin
// password. The seed never does this, so re-running it cannot overwrite a password changed since.
export const upsertUser = async ({ email, password, name, role, resetPassword = false }) => {
  if (!ROLES.includes(role)) throw new Error(`Role must be one of: ${ROLES.join(', ')}`)

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    // Changing the role signs the account out, so new permissions apply from the next sign-in.
    if (existing.role !== role) existing.sessions = []
    existing.role = role
    existing.emailVerified = true
    const changePassword = resetPassword && Boolean(password)
    if (changePassword) {
      existing.password = password
      // A new password signs the account out everywhere.
      existing.sessions = []
    }
    await existing.save()
    console.log(`${role} account already exists: ${existing.email}${changePassword ? ' (password updated)' : ''}`)
    return existing
  }

  if (!password) throw new Error(`A password is required to create ${email}`)
  const user = await User.create({ name, email, password, role, emailVerified: true })
  console.log(`${role} account created: ${user.email}`)
  return user
}
