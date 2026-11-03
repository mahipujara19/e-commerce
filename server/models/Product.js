import mongoose from 'mongoose'
import { jsonOptions } from '../utils/jsonTransform.js'

const reviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 0, max: 5, required: true },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now },
    reviewerName: { type: String, required: true },
    // Absent on the seeded catalog reviews; set for reviews written through the API.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false },
)

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true, trim: true, lowercase: true, index: true },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0 },
    brand: { type: String, trim: true },
    sku: { type: String, trim: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    discountPercentage: { type: Number, min: 0, max: 100, default: 0 },
    tags: { type: [String], default: [] },
    dimensions: { width: Number, height: Number, depth: Number },
    minimumOrderQuantity: Number,
    shippingInformation: String,
    warrantyInformation: String,
    returnPolicy: String,
    reviews: { type: [reviewSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: jsonOptions() },
)

export default mongoose.model('Product', productSchema)
