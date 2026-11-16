import { matchedData } from 'express-validator'
import mongoose from 'mongoose'
import { LOW_STOCK_THRESHOLD, LUXURY_CATEGORIES, MAX_SUGGESTIONS, PRODUCT_PAGE_SIZE } from '../../shared/catalog.js'
import Product from '../models/Product.js'
import { ApiError, sendSuccess } from '../utils/apiResponse.js'
import { audit } from '../utils/auditLog.js'
import { formatMoney } from '../utils/money.js'
import { notifyStockChanges } from '../utils/stockNotifications.js'

// Every sort ends on _id, so products with equal prices, ratings or dates keep one fixed order and paging never
// repeats or skips an item.
const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  'price-asc': { price: 1, _id: 1 },
  'price-desc': { price: -1, _id: 1 },
  rating: { rating: -1, _id: 1 },
  discount: { discountPercentage: -1, _id: 1 },
  name: { name: 1, _id: 1 },
  'stock-asc': { stock: 1, _id: 1 },
}

// "featured": the luxury categories first, in their set order, then the rest; best rated first within each.
export const PRODUCT_SORTS = ['featured', ...Object.keys(SORTS)]
export const STOCK_FILTERS = ['out', 'low', 'ok']

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const STOCK_QUERIES = {
  out: 0,
  // Matches the admin "Low stock" filter: everything that needs attention, sold out included.
  low: { $lte: LOW_STOCK_THRESHOLD },
  ok: { $gt: LOW_STOCK_THRESHOLD },
}

// Categories are stored as "mens-watches", so "mens watches" should find them too.
const categoryPatternFor = (text) => new RegExp(escapeRegex(text.trim().replace(/\s+/g, '-')), 'i')

// Ids are cast here because aggregate(), unlike find(), does not cast strings to ObjectIds.
const buildFilter = ({ category, categories = [], search, ids, stock }) => {
  const filter = {}
  const categoryList = [...new Set([category, ...categories].filter(Boolean).map((item) => item.toLowerCase()))]
  if (categoryList.length) filter.category = categoryList.length === 1 ? categoryList[0] : { $in: categoryList }
  if (ids?.length) filter._id = { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) }
  if (stock) filter.stock = STOCK_QUERIES[stock]
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ name: pattern }, { brand: pattern }, { sku: pattern }, { category: categoryPatternFor(search) }]
  }
  return filter
}

const featuredRank = {
  $let: {
    vars: { index: { $indexOfArray: [LUXURY_CATEGORIES, '$category'] } },
    in: { $cond: [{ $eq: ['$$index', -1] }, LUXURY_CATEGORIES.length, '$$index'] },
  },
}

// The ids for one page in "featured" order. The documents are then loaded with find() so they get the usual JSON shape.
const featuredPageIds = async (filter, skip, limit) => {
  const rows = await Product.aggregate([
    { $match: filter },
    { $addFields: { featuredRank } },
    { $sort: { featuredRank: 1, rating: -1, _id: 1 } },
    { $skip: skip },
    { $limit: limit },
    { $project: { _id: 1 } },
  ])
  return rows.map((row) => row._id)
}

/**
 * GET /api/products: one page of products plus paging metadata, { items, page, pageSize, total, totalPages }.
 * Filtering, search and sorting all happen in MongoDB. A page past the end returns no items with the real totals,
 * so the client can step back.
 */
export const getProducts = async (req, res, next) => {
  try {
    const { category, categories, search, ids, stock, sort = 'oldest', page = 1, pageSize, limit } = matchedData(req, { locations: ['query'] })
    const size = pageSize ?? limit ?? PRODUCT_PAGE_SIZE
    const skip = (page - 1) * size
    const filter = buildFilter({ category, categories, search, ids, stock })

    let items
    if (sort === 'featured') {
      const pageIds = await featuredPageIds(filter, skip, size)
      const byId = new Map((await Product.find({ _id: { $in: pageIds } })).map((product) => [product.id, product]))
      items = pageIds.map((id) => byId.get(String(id))).filter(Boolean)
    } else {
      items = await Product.find(filter).sort(SORTS[sort]).skip(skip).limit(size)
    }
    const total = await Product.countDocuments(filter)

    sendSuccess(res, {
      message: 'Products loaded',
      data: { items, page, pageSize: size, total, totalPages: Math.max(1, Math.ceil(total / size)) },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/products/summary: what the home, about and shop pages show about the catalogue as a whole, without
 * loading it. Every category with its product count and a picture, plus the product total and average rating.
 */
export const getProductSummary = async (_req, res, next) => {
  try {
    const [categories, [overall]] = await Promise.all([
      Product.aggregate([
        { $sort: { rating: -1, _id: 1 } },
        { $group: { _id: '$category', count: { $sum: 1 }, image: { $first: '$image' } } },
        { $sort: { _id: 1 } },
      ]),
      Product.aggregate([{ $group: { _id: null, total: { $sum: 1 }, averageRating: { $avg: '$rating' } } }]),
    ])

    sendSuccess(res, {
      message: 'Catalogue summary',
      data: {
        total: overall?.total ?? 0,
        averageRating: overall ? Math.round(overall.averageRating * 10) / 10 : 0,
        categories: categories.map(({ _id, count, image }) => ({ name: _id, count, image })),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Lower is better: a name that starts with the term, then a word in the name that does, then any other match.
const matchRank = (product, term) => {
  const name = product.name.toLowerCase()
  if (name.startsWith(term)) return 0
  if (name.split(/[\s-]+/).some((word) => word.startsWith(term))) return 1
  if (name.includes(term)) return 2
  if (product.brand?.toLowerCase().includes(term)) return 3
  return 4
}

/**
 * GET /api/products/suggestions?q=&category=: a short list for the search box. Up to MAX_SUGGESTIONS products,
 * trimmed to what a suggestion row shows, plus up to three matching categories and brands. An optional category
 * limits the suggestions to it.
 */
export const getProductSuggestions = async (req, res, next) => {
  try {
    const { q, category } = matchedData(req, { locations: ['query'] })
    const term = q.toLowerCase()
    const pattern = new RegExp(escapeRegex(q), 'i')
    const categoryPattern = categoryPatternFor(q)
    // With a category chosen in the header, only that category's pieces (and brands) are suggested.
    const scope = category ? { category } : {}

    // Capped so a one-letter search never reads the whole catalogue into memory just to rank it.
    const candidates = await Product.find({ ...scope, $or: [{ name: pattern }, { brand: pattern }, { category: categoryPattern }] })
      .select('name brand category image price discountPercentage rating')
      .sort({ rating: -1, _id: 1 })
      .limit(60)
      .lean()

    const products = candidates
      .map((product) => ({ product, rank: matchRank(product, term) }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_SUGGESTIONS)
      .map(({ product: { _id, ...product } }) => ({ id: String(_id), ...product }))

    const unique = (values) => [...new Set(values.filter(Boolean))]
    const categories = unique(candidates.map((product) => product.category)).filter((name) => categoryPattern.test(name)).slice(0, 3)
    const brands = unique(candidates.map((product) => product.brand)).filter((name) => pattern.test(name)).slice(0, 3)

    sendSuccess(res, { message: 'Suggestions', data: { query: q, products, categories, brands } })
  } catch (error) {
    next(error)
  }
}

// GET /api/products/stats: staff. Inventory totals for the dashboard, the inventory screen and the sidebar badge.
export const getProductStats = async (_req, res, next) => {
  try {
    const [stats] = await Product.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          units: { $sum: '$stock' },
          value: { $sum: { $multiply: ['$stock', '$price'] } },
          out: { $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] } },
          low: { $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', LOW_STOCK_THRESHOLD] }] }, 1, 0] } },
        },
      },
    ])
    const { total = 0, units = 0, value = 0, out = 0, low = 0 } = stats ?? {}
    sendSuccess(res, {
      message: 'Inventory stats',
      data: { total, units, value: Math.round(value * 100) / 100, low, out, lowStockThreshold: LOW_STOCK_THRESHOLD },
    })
  } catch (error) {
    next(error)
  }
}

export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) throw new ApiError(404, 'Product not found')

    sendSuccess(res, { message: 'Product loaded', data: product })
  } catch (error) {
    next(error)
  }
}

export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create({ ...matchedData(req, { locations: ['body'] }), createdBy: req.user._id })
    audit(req.user, 'product.create', { targetType: 'product', targetId: product.id, summary: `Created ${product.name} at ${formatMoney(product.price)}` })
    sendSuccess(res, { status: 201, message: 'Product created', data: product })
  } catch (error) {
    next(error)
  }
}

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) throw new ApiError(404, 'Product not found')

    const previousStock = product.stock
    const previousPrice = product.price
    const changes = matchedData(req, { locations: ['body'] })
    product.set(changes)
    await product.save()

    const notes = [
      previousPrice !== product.price && `price ${formatMoney(previousPrice)} → ${formatMoney(product.price)}`,
      previousStock !== product.stock && `stock ${previousStock} → ${product.stock}`,
    ].filter(Boolean)
    audit(req.user, 'product.update', {
      targetType: 'product',
      targetId: product.id,
      summary: `Updated ${product.name}${notes.length ? `: ${notes.join(', ')}` : ''}`,
      details: { fields: Object.keys(changes) },
    })

    sendSuccess(res, { message: 'Product updated', data: product })

    if (product.stock !== previousStock) {
      // Sent after the response so a slow or failing mail server never holds up the save.
      notifyStockChanges({
        changes: [{ name: product.name, sku: product.sku, previous: previousStock, updated: product.stock }],
        updatedBy: req.user,
      })
    }
  } catch (error) {
    next(error)
  }
}

// Staff and admins. Body: { updates: [{ id, stock }] }. Every product must exist or nothing is changed.
export const updateStock = async (req, res, next) => {
  try {
    const { updates } = matchedData(req, { locations: ['body'] })
    const ids = updates.map((update) => update.id)

    if (new Set(ids).size !== ids.length) throw new ApiError(400, 'Each product can only appear once per update')
    const found = await Product.countDocuments({ _id: { $in: ids } })
    if (found !== ids.length) throw new ApiError(404, 'One or more products no longer exist. Refresh and try again.')

    // findOneAndUpdate returns the document as it was, so the previous quantity is exact even under concurrent edits.
    const before = await Promise.all(
      updates.map(({ id, stock }) =>
        Product.findOneAndUpdate({ _id: id }, { $set: { stock } }, { returnDocument: 'before', runValidators: true }),
      ),
    )
    const products = await Product.find({ _id: { $in: ids } })

    sendSuccess(res, { message: `Stock updated for ${ids.length} ${ids.length === 1 ? 'product' : 'products'}`, data: products })

    // A product deleted mid-request comes back as null and is skipped.
    const changes = before
      .map((product, index) => product && { name: product.name, sku: product.sku, previous: product.stock, updated: updates[index].stock })
      .filter((change) => change && change.previous !== change.updated)
    if (changes.length) {
      audit(req.user, 'product.stock', {
        targetType: 'product',
        summary: changes.map(({ name, previous, updated }) => `${name}: ${previous} → ${updated}`).join('; '),
        details: { changes },
      })
    }
    notifyStockChanges({ changes, updatedBy: req.user })
  } catch (error) {
    next(error)
  }
}

const averageRating = (reviews) =>
  reviews.length ? Math.round((reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) * 100) / 100 : 0

// One review per customer: writing again replaces the earlier review.
export const addReview = async (req, res, next) => {
  try {
    if (!req.user.emailVerified) {
      throw new ApiError(403, 'Please verify your email address before writing a review')
    }

    const { rating, comment } = matchedData(req, { locations: ['body'] })
    const product = await Product.findById(req.params.id)
    if (!product) throw new ApiError(404, 'Product not found')

    const review = { rating, comment, date: new Date(), reviewerName: req.user.name, user: req.user._id }
    const existing = product.reviews.find((item) => item.user?.equals(req.user._id))

    if (existing) existing.set(review)
    else product.reviews.push(review)

    product.rating = averageRating(product.reviews)
    await product.save()

    sendSuccess(res, {
      status: existing ? 200 : 201,
      message: existing ? 'Review updated' : 'Review added',
      data: product,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) throw new ApiError(404, 'Product not found')

    audit(req.user, 'product.delete', { targetType: 'product', targetId: product.id, summary: `Deleted ${product.name}` })
    sendSuccess(res, { message: 'Product deleted' })
  } catch (error) {
    next(error)
  }
}
