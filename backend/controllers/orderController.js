import { matchedData } from 'express-validator'
import { STAFF_ROLES } from '../config/roles.js'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { ApiError, sendSuccess } from '../utils/apiResponse.js'
import { orderTotals } from '../utils/orderTotals.js'

const mergeQuantities = (items) => {
  const quantities = new Map()
  items.forEach(({ product, quantity }) => quantities.set(product, (quantities.get(product) ?? 0) + quantity))
  return quantities
}

const releaseStock = (items) =>
  Promise.all(items.map(({ product, quantity }) => Product.updateOne({ _id: product }, { $inc: { stock: quantity } })))

// The conditional update makes each reservation atomic, so concurrent orders cannot oversell.
// MongoDB transactions need a replica set, so a failure instead gives back what was already reserved.
const reserveStock = async (items) => {
  const reserved = []

  for (const item of items) {
    const { modifiedCount } = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } },
    )

    if (!modifiedCount) {
      await releaseStock(reserved)
      throw new ApiError(400, `Not enough stock for ${item.name}. Please update your bag.`)
    }
    reserved.push(item)
  }
}

export const createOrder = async (req, res, next) => {
  try {
    const { items: requested, shippingAddress } = matchedData(req, { locations: ['body'] })
    const quantities = mergeQuantities(requested)
    const products = await Product.find({ _id: { $in: [...quantities.keys()] } })

    if (products.length !== quantities.size) {
      throw new ApiError(400, 'An item in your bag is no longer available. Please remove it and try again.')
    }

    // Names and prices always come from the database, never from the client.
    const items = products.map((product) => ({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: quantities.get(product.id),
    }))

    await reserveStock(items)

    try {
      const order = await Order.create({ user: req.user._id, items, shippingAddress, ...orderTotals(items) })
      sendSuccess(res, { status: 201, message: 'Order placed', data: order })
    } catch (error) {
      await releaseStock(items)
      throw error
    }
  } catch (error) {
    next(error)
  }
}

export const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })
    sendSuccess(res, { message: 'Orders loaded', data: orders })
  } catch (error) {
    next(error)
  }
}

const CUSTOMER_FIELDS = 'name email phone'

export const getAllOrders = async (_req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('user', CUSTOMER_FIELDS)
    sendSuccess(res, { message: 'Orders loaded', data: orders })
  } catch (error) {
    next(error)
  }
}

export const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) throw new ApiError(404, 'Order not found')

    if (!order.user.equals(req.user._id) && !STAFF_ROLES.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to view this order')
    }

    sendSuccess(res, { message: 'Order loaded', data: order })
  } catch (error) {
    next(error)
  }
}

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body

    // Excluding cancelled orders in the query means stock can only be returned once.
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: 'cancelled' } },
      { status },
      { returnDocument: 'after', runValidators: true },
    )

    if (!order) {
      const exists = await Order.exists({ _id: req.params.id })
      throw exists ? new ApiError(400, 'A cancelled order cannot be changed') : new ApiError(404, 'Order not found')
    }

    if (status === 'cancelled') await releaseStock(order.items)

    await order.populate('user', CUSTOMER_FIELDS)
    sendSuccess(res, { message: 'Order updated', data: order })
  } catch (error) {
    next(error)
  }
}
