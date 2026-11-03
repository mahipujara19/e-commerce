// Creates the admin account and loads the catalog. Usage: npm run seed [-- --reset]
import './config/env.js'
import { readFile } from 'node:fs/promises'
import mongoose from 'mongoose'
import { connectDb } from './config/db.js'
import Product from './models/Product.js'
import User from './models/User.js'

const resolveAdmin = async () => {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.')

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) {
    existing.role = 'admin'
    existing.emailVerified = true
    await existing.save()
    console.log(`Admin account already exists: ${existing.email}`)
    return existing
  }

  const admin = await User.create({ name: 'Store Admin', email, password, role: 'admin', emailVerified: true })
  console.log(`Admin account created: ${admin.email}`)
  return admin
}

const seed = async () => {
  await connectDb()
  const admin = await resolveAdmin()

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
