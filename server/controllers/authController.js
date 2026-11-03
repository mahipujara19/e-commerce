import { env } from '../config/env.js'
import { getBearerToken } from '../middleware/authMiddleware.js'
import User from '../models/User.js'
import { ApiError, sendSuccess } from '../utils/apiResponse.js'
import {
  generateAccessToken,
  generateEmailToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_MAX_AGE_MS,
  tokenMatchesHash,
  verifyRefreshToken,
} from '../utils/generateTokens.js'
import { sendPasswordResetEmail, sendVerificationEmail } from '../utils/sendEmail.js'

const REFRESH_COOKIE = 'refreshToken'
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const RESET_TTL_MS = 60 * 60 * 1000

// httpOnly keeps the token away from page scripts; strict same-site and the path limit where it is sent.
const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict',
  path: '/api/auth',
}

const getRefreshToken = (req) => req.cookies?.[REFRESH_COOKIE] || getBearerToken(req)

const startSession = async (res, user) => {
  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)

  await User.updateOne({ _id: user._id }, { refreshToken: hashToken(refreshToken) })
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE_MS })

  return { user, accessToken, refreshToken }
}

// Replaces any earlier link, so only the newest verification email works.
export const issueVerificationEmail = async (user) => {
  const { token, hash } = generateEmailToken()
  await User.updateOne(
    { _id: user._id },
    { emailVerificationToken: hash, emailVerificationExpires: new Date(Date.now() + VERIFICATION_TTL_MS) },
  )
  await sendVerificationEmail(user, token)
}

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body

    if (await User.exists({ email })) {
      throw new ApiError(409, 'An account with this email already exists')
    }

    // role is deliberately not read from the request: admins are only created by the seed script.
    const user = await User.create({ name, email, password, phone: phone || undefined })
    const data = await startSession(res, user)

    // The account is usable either way; the user can request a new link from their profile.
    await issueVerificationEmail(user).catch((error) => console.error(`Verification email failed: ${error.message}`))

    sendSuccess(res, { status: 201, message: 'Account created', data })
  } catch (error) {
    next(error)
  }
}

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+password')

    // Same message for both cases so the response does not reveal which emails are registered.
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, 'Incorrect email or password')
    }

    const data = await startSession(res, user)
    sendSuccess(res, { message: 'Signed in', data })
  } catch (error) {
    next(error)
  }
}

export const refresh = async (req, res, next) => {
  try {
    const token = getRefreshToken(req)
    if (!token) throw new ApiError(401, 'Refresh token required')

    let payload
    try {
      payload = verifyRefreshToken(token)
    } catch {
      throw new ApiError(401, 'Invalid or expired refresh token')
    }

    const user = await User.findById(payload.sub).select('+refreshToken')
    if (!user || !tokenMatchesHash(token, user.refreshToken)) {
      throw new ApiError(401, 'Session is no longer valid')
    }

    sendSuccess(res, {
      message: 'Access token refreshed',
      data: { user, accessToken: generateAccessToken(user) },
    })
  } catch (error) {
    next(error)
  }
}

export const logout = async (req, res, next) => {
  try {
    const token = getRefreshToken(req)
    if (token) {
      await User.updateOne({ refreshToken: hashToken(token) }, { $unset: { refreshToken: 1 } })
    }

    res.clearCookie(REFRESH_COOKIE, cookieOptions)
    sendSuccess(res, { message: 'Signed out' })
  } catch (error) {
    next(error)
  }
}

export const verifyEmail = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { emailVerificationToken: hashToken(req.body.token), emailVerificationExpires: { $gt: new Date() } },
      { emailVerified: true, $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 } },
      { returnDocument: 'after' },
    )
    if (!user) throw new ApiError(400, 'This verification link is invalid or has expired')

    sendSuccess(res, { message: 'Email verified', data: { email: user.email } })
  } catch (error) {
    next(error)
  }
}

const RESET_REQUESTED_MESSAGE = 'If an account exists for that email, a reset link is on its way'

export const forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email })

    // The response is the same either way so it does not reveal which emails are registered.
    if (user) {
      const { token, hash } = generateEmailToken()
      await User.updateOne(
        { _id: user._id },
        { passwordResetToken: hash, passwordResetExpires: new Date(Date.now() + RESET_TTL_MS) },
      )
      await sendPasswordResetEmail(user, token).catch((error) => console.error(`Reset email failed: ${error.message}`))
    }

    sendSuccess(res, { message: RESET_REQUESTED_MESSAGE })
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

    // Following the link proves the user owns the address. Clearing the refresh token signs out other sessions.
    user.password = password
    user.emailVerified = true
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    user.refreshToken = undefined
    await user.save()

    sendSuccess(res, { message: 'Password updated. Please sign in with your new password.' })
  } catch (error) {
    next(error)
  }
}
