import mongoose from 'mongoose'

// One counter per limiter and client. Stored in MongoDB so limits hold across restarts and server instances.
// `key` holds a SHA-256 of the IP, email or user id, never the raw value.
const rateLimitSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true },
    // MongoDB deletes the document once the window ends.
    resetAt: { type: Date, required: true, expires: 0 },
  },
  { versionKey: false },
)

export default mongoose.model('RateLimit', rateLimitSchema)
