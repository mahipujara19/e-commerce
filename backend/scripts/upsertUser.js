import { ROLES } from '../config/roles.js'
import User from '../models/User.js'

// Shared by seed.js and createUser.js. Accounts made here are trusted, so they skip email verification.
export const upsertUser = async ({ email, password, name, role }) => {
  if (!ROLES.includes(role)) throw new Error(`Role must be one of: ${ROLES.join(', ')}`)

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    // Changing the role signs the account out, so new permissions apply from the next sign-in.
    if (existing.role !== role) existing.sessions = []
    existing.role = role
    existing.emailVerified = true
    await existing.save()
    console.log(`${role} account already exists: ${existing.email}`)
    return existing
  }

  if (!password) throw new Error(`A password is required to create ${email}`)
  const user = await User.create({ name, email, password, role, emailVerified: true })
  console.log(`${role} account created: ${user.email}`)
  return user
}
