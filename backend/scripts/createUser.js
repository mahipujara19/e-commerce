// Creates an account with a given role, or updates an existing one: its role and, when --password is given, its password.
// Usage: npm run user:create -- --email jo@example.com --password "Secret123!" --name "Jo Smith" --role staff
import '../config/env.js'
import { parseArgs } from 'node:util'
import mongoose from 'mongoose'
import { connectDb } from '../config/db.js'
import { runMigrations } from '../utils/migrations.js'
import { upsertUser } from './upsertUser.js'

const run = async () => {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      password: { type: 'string' },
      name: { type: 'string', default: 'Store Staff' },
      role: { type: 'string', default: 'staff' },
    },
  })
  if (!values.email) throw new Error('--email is required')

  await connectDb()
  await runMigrations()
  await upsertUser({ ...values, resetPassword: true })
}

run()
  .catch((error) => {
    console.error(`Could not create user: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
