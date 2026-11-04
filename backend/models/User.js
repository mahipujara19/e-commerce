import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { DEFAULT_ROLE, ROLES } from '../config/roles.js'
import { jsonOptions } from '../utils/jsonTransform.js'

const SALT_ROUNDS = 12

// One entry per signed-in device. Only SHA-256 hashes are stored, never the refresh tokens themselves.
// previousHash lets a tab that raced another tab's refresh still succeed for a few seconds after rotation.
const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    previousHash: String,
    rotatedAt: Date,
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: DEFAULT_ROLE, index: true },
    sessions: { type: [sessionSchema], default: [], select: false },
    emailVerified: { type: Boolean, default: false },
    // Email links carry the raw token; only its SHA-256 is stored, like the refresh token.
    emailVerificationToken: { type: String, select: false, index: true },
    emailVerificationExpires: { type: Date, select: false },
    // When the last verification email went out, so resends can be rate limited.
    emailVerificationSentAt: { type: Date, select: false },
    passwordResetToken: { type: String, select: false, index: true },
    passwordResetExpires: { type: Date, select: false },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  {
    timestamps: true,
    toJSON: jsonOptions([
      'password',
      'sessions',
      'emailVerificationToken',
      'emailVerificationExpires',
      'emailVerificationSentAt',
      'passwordResetToken',
      'passwordResetExpires',
      'wishlist',
    ]),
  },
)

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS)
  }
})

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

export default mongoose.model('User', userSchema)
