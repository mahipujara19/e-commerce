import RateLimit from '../models/RateLimit.js'
import { hashToken } from './generateTokens.js'

/**
 * Fixed-window counter backed by MongoDB.
 *
 * check(id) → { count, blocked, exceeded, retryAfterMs } without counting.
 * hit(id)   → counts one event atomically and returns the new state. With { blockMs }, reaching the limit
 *             holds the block for blockMs from that moment (used for login lockouts).
 *
 * blocked  (count >= max): the allowance is used up, so the next attempt must be refused. Used with check().
 * exceeded (count >  max): the event just counted went over the allowance. Used right after hit().
 * reset(id) → forgets the client, e.g. after a successful login.
 */
export const createLimiter = ({ name, max, windowMs }) => {
  const keyFor = (id) => `${name}:${hashToken(String(id))}`

  const toState = (doc, now) => {
    const active = Boolean(doc) && doc.resetAt > now
    const count = active ? doc.count : 0
    return { count, blocked: count >= max, exceeded: count > max, retryAfterMs: active ? doc.resetAt - now : 0 }
  }

  const increment = (key, now) => {
    const active = { $gt: ['$resetAt', now] }
    // A pipeline update so "start a new window or add to the current one" is a single atomic step.
    return RateLimit.collection.findOneAndUpdate(
      { key },
      [{
        $set: {
          count: { $cond: [active, { $add: ['$count', 1] }, 1] },
          resetAt: { $cond: [active, '$resetAt', new Date(now.getTime() + windowMs)] },
        },
      }],
      { upsert: true, returnDocument: 'after' },
    )
  }

  return {
    async check(id) {
      return toState(await RateLimit.findOne({ key: keyFor(id) }).lean(), new Date())
    },

    async hit(id, { blockMs } = {}) {
      const key = keyFor(id)
      const now = new Date()
      let doc
      try {
        doc = await increment(key, now)
      } catch (error) {
        // Two first requests can race to insert the same key; the loser simply increments the winner's document.
        if (error.code !== 11000) throw error
        doc = await increment(key, now)
      }

      if (blockMs && doc.count === max) {
        doc.resetAt = new Date(now.getTime() + blockMs)
        await RateLimit.updateOne({ key }, { resetAt: doc.resetAt })
      }
      return toState(doc, now)
    },

    reset(id) {
      return RateLimit.deleteOne({ key: keyFor(id) })
    },
  }
}
