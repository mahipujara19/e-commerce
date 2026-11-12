// Brute-force and abuse thresholds. Failed logins count per IP and per email; the other limits count every request.
const MINUTE = 60 * 1000

export const LOGIN_POLICY = {
  maxFailures: 5,
  windowMs: 15 * MINUTE,
  // Applies to every email that hits the limit, known or not, so a lockout never reveals that an account exists.
  lockoutMs: 15 * MINUTE,
}

export const RATE_LIMITS = {
  // Deliberately much higher than the per-account limit: people on one network share an IP, so one person
  // locking their own account must not block everyone else. This only stops one IP guessing across many accounts.
  loginIp: { max: 50, windowMs: LOGIN_POLICY.windowMs },
  loginAccount: { max: LOGIN_POLICY.maxFailures, windowMs: LOGIN_POLICY.windowMs },
  forgotPasswordIp: { max: 10, windowMs: 60 * MINUTE },
  forgotPasswordEmail: { max: 3, windowMs: 60 * MINUTE },
  resetPasswordIp: { max: 10, windowMs: 15 * MINUTE },
  resendVerificationUser: { max: 5, windowMs: 60 * MINUTE },
  resendVerificationIp: { max: 10, windowMs: 60 * MINUTE },
  // Stops a script or a stuck button from placing a flood of orders (each one holds stock).
  signupIp: { max: 10, windowMs: 60 * MINUTE },
  placeOrderUser: { max: 10, windowMs: 15 * MINUTE },
  contactIp: { max: 5, windowMs: 60 * MINUTE },
  clientErrorsIp: { max: 30, windowMs: 15 * MINUTE },
}
