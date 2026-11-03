import { matchedData } from 'express-validator'
import Product from '../models/Product.js'
import { ApiError, sendSuccess } from '../utils/apiResponse.js'

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  rating: { rating: -1 },
  discount: { discountPercentage: -1 },
  name: { name: 1 },
}

export const PRODUCT_SORTS = Object.keys(SORTS)

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const getProducts = async (req, res, next) => {
  try {
    const { category, search, sort, limit } = matchedData(req, { locations: ['query'] })
    const filter = {}

    if (category) filter.category = category.toLowerCase()
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i')
      filter.$or = [{ name: pattern }, { brand: pattern }, { category: pattern }]
    }

    let query = Product.find(filter).sort(SORTS[sort] ?? SORTS.oldest)
    if (limit) query = query.limit(limit)

    sendSuccess(res, { message: 'Products loaded', data: await query })
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
    sendSuccess(res, { status: 201, message: 'Product created', data: product })
  } catch (error) {
    next(error)
  }
}

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) throw new ApiError(404, 'Product not found')

    product.set(matchedData(req, { locations: ['body'] }))
    await product.save()

    sendSuccess(res, { message: 'Product updated', data: product })
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

    sendSuccess(res, { message: 'Product deleted' })
  } catch (error) {
    next(error)
  }
}
