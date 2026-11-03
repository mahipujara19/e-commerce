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
import { validate } from '../middleware/validate.js'

const router = Router()

const emailRule = () =>
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

const passwordRule = () =>
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

const signupRules = [nameRule(), emailRule(), phoneRule(), passwordRule()]

const loginRules = [
  emailRule(),
  body('password').isString().notEmpty().withMessage('Password is required'),
]

router.post('/signup', signupRules, validate, signup)
router.post('/login', loginRules, validate, login)
router.post('/refresh', refresh)
router.post('/logout', logout)
router.post('/verify-email', tokenRule(), validate, verifyEmail)
router.post('/forgot-password', emailRule(), validate, forgotPassword)
router.post('/reset-password', [tokenRule(), passwordRule()], validate, resetPassword)

export default router
