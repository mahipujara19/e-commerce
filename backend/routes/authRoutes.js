import { Router } from 'express'
import { body } from 'express-validator'
import {
  forgotPassword,
  login,
  logout,
  refresh,
  resetPassword,
  signup,
  verifyEmail,
} from '../controllers/authController.js'
import { byIp, limitRequests } from '../middleware/rateLimit.js'
import { validate } from '../middleware/validate.js'
import { limiters } from '../utils/limiters.js'
import { requireCaptcha } from '../utils/recaptcha.js'

const router = Router()

export const emailRule = () =>
  body('email')
    .isString().withMessage('Email is required')
    .trim()
    .isEmail().withMessage('Please enter a valid email address')
    .toLowerCase()

export const nameRule = () =>
  body('name')
    .isString().withMessage('Name is required')
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')

export const phoneRule = () =>
  body('phone')
    .optional({ values: 'falsy' })
    .isString().withMessage('Please enter a valid phone number')
    .matches(/^\+?[\d\s\-()]{7,15}$/).withMessage('Please enter a valid phone number')

export const passwordRule = () =>
  body('password')
    .isString().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    // bcrypt ignores everything past 72 bytes.
    .isByteLength({ max: 72 }).withMessage('Password must be at most 72 bytes')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain at least one special character (!@#$%^&*)')

const tokenRule = () =>
  body('token').isString().isHexadecimal().isLength({ min: 64, max: 64 }).withMessage('This link is invalid or has expired')

const signupRules = [nameRule(), emailRule(), phoneRule(), passwordRule(), body('marketingOptIn').optional().isBoolean().toBoolean()]

const signupIpLimit = limitRequests({
  limiter: limiters.signupIp,
  key: byIp,
  name: 'signupIp',
  message: 'Too many accounts created from this network. Please try again later.',
})

const loginRules = [
  emailRule(),
  body('password').isString().notEmpty().withMessage('Password is required'),
]

router.post('/signup', signupIpLimit, signupRules, validate, requireCaptcha, signup)
// Failed logins are limited per IP and per email inside the controller, since only failures count.
router.post('/login', loginRules, validate, login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.post('/verify-email', tokenRule(), validate, verifyEmail)
const forgotPasswordIpLimit = limitRequests({
  limiter: limiters.forgotPasswordIp,
  key: byIp,
  name: 'forgotPasswordIp',
  message: 'Too many password reset requests. Please try again later.',
})

const resetPasswordIpLimit = limitRequests({
  limiter: limiters.resetPasswordIp,
  key: byIp,
  name: 'resetPasswordIp',
  message: 'Too many attempts. Please wait a few minutes and try again.',
})

// The per-email limit for forgot-password lives in the controller so it can answer without revealing anything.
router.post('/forgot-password', forgotPasswordIpLimit, emailRule(), validate, forgotPassword)
router.post('/reset-password', resetPasswordIpLimit, [tokenRule(), passwordRule()], validate, resetPassword)

export default router
