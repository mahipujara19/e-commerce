import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { LOGIN_POLICY } from '../config/security.js'
import User, { SALT_ROUNDS } from '../models/User.js'
import { ApiError, sendSuccess } from '../utils/apiResponse.js'
import { clientIp } from '../utils/clientIp.js'
import {
  ACCESS_TOKEN_MAX_AGE_MS,
  generateAccessToken,
  generateEmailToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_MAX_AGE_MS,
  verifyRefreshToken,
} from '../utils/generateTokens.js'
import { limiters } from '../utils/limiters.js'
import { logSecurityEvent } from '../utils/securityLog.js'
import { EmailDeliveryError, sendPasswordResetEmail, sendVerificationEmail } from '../utils/sendEmail.js'

const REFRESH_COOKIE = 'refreshToken'
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000
const RESET_TTL_MS = 60 * 60 * 1000
const MAX_SESSIONS = 10
// How long a just-rotated refresh token is still accepted, for tabs that refreshed at the same moment.
const ROTATION_GRACE_MS = 30 * 1000

// httpOnly keeps the token away from page scripts; the path limits it to refresh and logout.
// sameSite and secure come from COOKIE_SAMESITE / COOKIE_SECURE (see config/env.js).
const cookieOptions = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: '/api/auth',
}

const setRefreshCookie = (res, token) => res.cookie(REFRESH_COOKIE, token, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE_MS })
const clearRefreshCookie = (res) => res.clearCookie(REFRESH_COOKIE, cookieOptions)

const sessionPayload = (user) => ({
  user,
  accessToken: generateAccessToken(user),
  accessTokenExpiresIn: ACCESS_TOKEN_MAX_AGE_MS,
})

const startSession = async (res, user) => {
  const refreshToken = generateRefreshToken(user)
  const now = Date.now()

  // Two writes because MongoDB cannot $pull and $push the same array in one update.
  await User.updateOne({ _id: user._id }, { $pull: { sessions: { expiresAt: { $lte: new Date(now) } } } })
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        sessions: {
          $each: [{ tokenHash: hashToken(refreshToken), expiresAt: new Date(now + REFRESH_TOKEN_MAX_AGE_MS) }],
          $slice: -MAX_SESSIONS,
        },
      },
    },
  )
  setRefreshCookie(res, refreshToken)

  return sessionPayload(user)
}

const sessionExpiredError = (message) => new ApiError(401, message, { code: 'SESSION_EXPIRED' })

// Replaces any earlier link, so only the newest verification email works.
// Throws EmailDeliveryError when the email could not be sent; the token is stored either way.
export const issueVerificationEmail = async (user) => {
  const { token, hash } = generateEmailToken()
  const now = Date.now()
  await User.updateOne(
    { _id: user._id },
    {
      emailVerificationToken: hash,
      emailVerificationExpires: new Date(now + VERIFICATION_TTL_MS),
      emailVerificationSentAt: new Date(now),
    },
  )
  try {
    await sendVerificationEmail(user, token)
  } catch (error) {
    // Nothing was sent, so the resend cooldown must not apply.
    await User.updateOne({ _id: user._id }, { $unset: { emailVerificationSentAt: 1 } })
    throw error
  }
}

export const resendVerificationEmail = async (user) => {
  if (user.emailVerified) throw new ApiError(400, 'Your email address is already verified')

  const { emailVerificationSentAt: sentAt } = await User.findById(user._id).select('+emailVerificationSentAt').lean()
  const waitMs = sentAt ? VERIFICATION_RESEND_COOLDOWN_MS - (Date.now() - sentAt.getTime()) : 0
  if (waitMs > 0) {
    const retryAfterSeconds = Math.ceil(waitMs / 1000)
    throw new ApiError(429, `Please wait ${retryAfterSeconds} seconds before requesting another link`, {
      code: 'RATE_LIMITED',
      retryAfterSeconds,
    })
  }

  try {
    await issueVerificationEmail(user)
  } catch (error) {
    if (!(error instanceof EmailDeliveryError)) throw error
    console.error(`[email] Verification email failed: ${error.message}`)
    throw new ApiError(502, 'We could not send the verification email right now. Please try again in a few minutes.')
  }
}

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, phone, marketingOptIn } = req.body

    if (await User.exists({ email })) {
      throw new ApiError(409, 'An account with this email already exists')
    }

    // role is deliberately not read from the request: staff and admins are created by an admin or the seed scripts.
    const user = await User.create({ name, email, password, phone: phone || undefined, marketingOptIn: marketingOptIn === true })
    const data = await startSession(res, user)

    // The account is usable either way; the user can request a new link from their profile.
    let verificationEmailSent = true
    try {
      await issueVerificationEmail(user)
    } catch (error) {
      verificationEmailSent = false
      console.error(`[email] Verification email failed: ${error.message}`)
    }

    sendSuccess(res, { status: 201, message: 'Account created', data: { ...data, verificationEmailSent } })
  } catch (error) {
    next(error)
  }
}

const LOGIN_BLOCKED_MESSAGE = 'Too many failed attempts. Please try again later.'
const LOGIN_FAILED_MESSAGE = 'Incorrect email or password'

// Checked when the email is unknown, so a wrong email takes as long as a wrong password.
const dummyHash = bcrypt.hash(randomBytes(32).toString('hex'), SALT_ROUNDS)

const loginBlocked = () => new ApiError(429, LOGIN_BLOCKED_MESSAGE, { code: 'LOGIN_BLOCKED' })

// Counts the failure per IP and per email. The email counter runs for unknown emails too, so known and unknown
// addresses are locked out identically; for real accounts the lockout is also stored on the user.
const recordLoginFailure = async ({ ip, email, user }) => {
  const [, account] = await Promise.all([
    limiters.loginIp.hit(ip),
    limiters.loginAccount.hit(email, { blockMs: LOGIN_POLICY.lockoutMs }),
  ])

  logSecurityEvent('login_failed', { ip, email, reason: user ? 'wrong_password' : 'unknown_email', attempts: account.count })

  if (account.count === LOGIN_POLICY.maxFailures) {
    const lockUntil = new Date(Date.now() + LOGIN_POLICY.lockoutMs)
    if (user) await User.updateOne({ _id: user._id }, { lockUntil })
    logSecurityEvent('account_locked', { ip, email, until: lockUntil.toISOString(), knownAccount: Boolean(user) })
  }
}

/**
 * Order matters:
 * 1. Refuse if this IP or this email has too many recent failures, or the account is locked,
 *    before the password is looked at, so a locked account cannot be probed.
 * 2. Check the password. Unknown emails are checked against a dummy hash so timing gives nothing away.
 * 3. On success, clear the account's failure count and lock. The IP count is kept, so one valid login
 *    cannot reset an attacker's budget for guessing other accounts.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const ip = clientIp(req)

    const [ipState, accountState, user] = await Promise.all([
      limiters.loginIp.check(ip),
      limiters.loginAccount.check(email),
      User.findOne({ email }).select('+password +lockUntil'),
    ])

    if (ipState.blocked) {
      logSecurityEvent('login_blocked', { ip, email, reason: 'ip_rate_limited' })
      throw loginBlocked()
    }

    // An expired lockUntil is simply ignored here and removed on the next successful sign-in.
    const locked = user?.lockUntil > new Date()
    if (accountState.blocked || locked) {
      logSecurityEvent('login_blocked', { ip, email, reason: locked ? 'account_locked' : 'account_rate_limited' })
      throw loginBlocked()
    }

    const valid = user ? await user.comparePassword(password) : (await bcrypt.compare(password, await dummyHash), false)
    if (!valid) {
      await recordLoginFailure({ ip, email, user })
      throw new ApiError(401, LOGIN_FAILED_MESSAGE)
    }

    if (accountState.count || user.lockUntil) {
      await Promise.all([limiters.loginAccount.reset(email), User.updateOne({ _id: user._id }, { $unset: { lockUntil: 1 } })])
    }

    const data = await startSession(res, user)
    sendSuccess(res, { message: 'Signed in', data })
  } catch (error) {
    next(error)
  }
}

/**
 * Rotates the refresh token: the old one stops working and a new cookie is set.
 *
 * - Current token      → rotate atomically and return a new access token.
 * - Just-rotated token → another tab refreshed a moment ago; the browser already holds the new cookie,
 *                        so return an access token without rotating again.
 * - Older token        → it was stolen or replayed; that session is revoked.
 */
export const refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (!token) throw sessionExpiredError('Please sign in to continue')

    let payload
    try {
      payload = verifyRefreshToken(token)
    } catch {
      clearRefreshCookie(res)
      throw sessionExpiredError('Your session has expired. Please sign in again.')
    }

    const hash = hashToken(token)
    const now = new Date()
    const nextToken = generateRefreshToken({ id: payload.sub })

    const rotated = await User.findOneAndUpdate(
      { _id: payload.sub, sessions: { $elemMatch: { tokenHash: hash, expiresAt: { $gt: now } } } },
      {
        $set: {
          'sessions.$.tokenHash': hashToken(nextToken),
          'sessions.$.previousHash': hash,
          'sessions.$.rotatedAt': now,
          'sessions.$.expiresAt': new Date(now.getTime() + REFRESH_TOKEN_MAX_AGE_MS),
        },
      },
      { returnDocument: 'after' },
    )

    if (rotated) {
      setRefreshCookie(res, nextToken)
      return sendSuccess(res, { message: 'Session refreshed', data: sessionPayload(rotated) })
    }

    const user = await User.findById(payload.sub).select('+sessions')
    const previous = user?.sessions.find((session) => session.previousHash === hash)

    if (previous && now - previous.rotatedAt < ROTATION_GRACE_MS) {
      return sendSuccess(res, { message: 'Session refreshed', data: sessionPayload(user) })
    }

    if (previous) {
      await User.updateOne({ _id: user._id }, { $pull: { sessions: { previousHash: hash } } })
      console.warn(`[auth] Reused refresh token for user ${user.id}; session revoked`)
    }

    clearRefreshCookie(res)
    throw sessionExpiredError('Your session is no longer valid. Please sign in again.')
  } catch (error) {
    next(error)
  }
}

// Works with an expired access token: the refresh cookie alone identifies the session to end.
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (token) {
      const hash = hashToken(token)
      await User.updateOne({ 'sessions.tokenHash': hash }, { $pull: { sessions: { tokenHash: hash } } })
    }

    clearRefreshCookie(res)
    sendSuccess(res, { message: 'Signed out' })
  } catch (error) {
    next(error)
  }
}

export const verifyEmail = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { emailVerificationToken: hashToken(req.body.token), emailVerificationExpires: { $gt: new Date() } },
      {
        emailVerified: true,
        $unset: { emailVerificationToken: 1, emailVerificationExpires: 1, emailVerificationSentAt: 1 },
      },
      { returnDocument: 'after' },
    )
    if (!user) throw new ApiError(400, 'This verification link is invalid or has expired')

    sendSuccess(res, { message: 'Email verified', data: { email: user.email } })
  } catch (error) {
    next(error)
  }
}

const RESET_REQUESTED_MESSAGE = 'If an account exists for that email, a reset link is on its way'

const sendResetLink = async (user) => {
  const { token, hash } = generateEmailToken()
  await User.updateOne(
    { _id: user._id },
    { passwordResetToken: hash, passwordResetExpires: new Date(Date.now() + RESET_TTL_MS) },
  )
  await sendPasswordResetEmail(user, token)
}

// The response is identical, and equally fast, whether or not the email is registered:
// the link is sent after responding, and the per-email limit applies to unknown emails too.
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body

    // Over the limit: answer as usual but send nothing, so one inbox cannot be flooded with reset emails.
    const { exceeded } = await limiters.forgotPasswordEmail.hit(email)
    if (exceeded) {
      logSecurityEvent('rate_limited', { limit: 'forgotPasswordEmail', ip: clientIp(req), email })
      return sendSuccess(res, { message: RESET_REQUESTED_MESSAGE })
    }

    const user = await User.findOne({ email })
    sendSuccess(res, { message: RESET_REQUESTED_MESSAGE })

    if (user) sendResetLink(user).catch((error) => console.error(`[email] Reset email failed: ${error.message}`))
  } catch (error) {
    next(error)
  }
}

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body
    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: { $gt: new Date() },
    })
    if (!user) throw new ApiError(400, 'This reset link is invalid or has expired')

    // Following the link proves the user owns the address. Clearing the sessions signs out every device.
    user.password = password
    user.emailVerified = true
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    user.sessions = []
    // Proving ownership of the email also lifts any sign-in lockout.
    user.lockUntil = undefined
    await user.save()
    await limiters.loginAccount.reset(user.email)

    sendSuccess(res, { message: 'Password updated. Please sign in with your new password.' })
  } catch (error) {
    next(error)
  }
}
