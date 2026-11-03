import { validationResult } from 'express-validator'
import { ApiError } from '../utils/apiResponse.js'

export const validate = (req, _res, next) => {
  const result = validationResult(req)
  if (result.isEmpty()) return next()

  const errors = result.array({ onlyFirstError: true }).map(({ path, msg }) => ({ field: path, message: msg }))
  return next(new ApiError(400, errors[0].message, { errors }))
}
