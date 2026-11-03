import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { jsonOptions } from '../utils/jsonTransform.js'

const SALT_ROUNDS = 12

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // SHA-256 of the current refresh token; only one session per user is valid at a time.
    refreshToken: { type: String, select: false, index: true },
    emailVerified: { type: Boolean, default: false },
    // Email links carry the raw token; only its SHA-256 is stored, like the refresh token.
    emailVerificationToken: { type: String, select: false, index: true },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false, index: true },
    passwordResetExpires: { type: Date, select: false },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  },
  {
    timestamps: true,
    toJSON: jsonOptions([
      'password',
      'refreshToken',
      'emailVerificationToken',
      'emailVerificationExpires',
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
