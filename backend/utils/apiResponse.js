export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message)
    this.status = status
    this.data = data
  }
}

export const sendSuccess = (res, { status = 200, message = 'OK', data = null } = {}) =>
  res.status(status).json({ success: true, message, data })
