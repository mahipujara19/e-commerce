// Exposes `id` instead of `_id` and drops internal fields from API responses.
export const jsonOptions = (hidden = []) => ({
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id
    hidden.forEach((field) => delete ret[field])
    return ret
  },
})
