// Creates the admin (and optional staff) account and loads the catalog. Usage: npm run seed [-- --reset]
import './config/env.js'
import { readFile } from 'node:fs/promises'
import mongoose from 'mongoose'
import { connectDb } from './config/db.js'
import Product from './models/Product.js'
import { upsertUser } from './scripts/upsertUser.js'
import { runMigrations } from './utils/migrations.js'

const seedAccounts = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, STAFF_EMAIL, STAFF_PASSWORD } = process.env
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.')

  const admin = await upsertUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Store Admin', role: 'admin' })
  // Optional: a staff account for trying out the limited admin panel.
  if (STAFF_EMAIL) await upsertUser({ email: STAFF_EMAIL, password: STAFF_PASSWORD, name: 'Store Staff', role: 'staff' })
  return admin
}

const seed = async () => {
  await connectDb()
  await runMigrations()
  const admin = await seedAccounts()

  if (process.argv.includes('--reset')) {
    const { deletedCount } = await Product.deleteMany({})
    console.log(`Removed ${deletedCount} products`)
  }

  const existing = await Product.countDocuments()
  if (existing) {
    console.log(`Skipped products: the collection already has ${existing}. Use --reset to replace them.`)
    return
  }

  const catalog = JSON.parse(await readFile(new URL('./data/products.json', import.meta.url), 'utf8'))
  await Product.insertMany(catalog.map((product) => ({ ...product, createdBy: admin._id })))
  console.log(`Inserted ${catalog.length} products`)
}

seed()
  .catch((error) => {
    console.error(`Seed failed: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())
