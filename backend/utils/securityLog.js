// One JSON line per event, so logs can be searched and shipped as-is. JSON.stringify escapes newlines,
// which stops user input such as an email from forging extra log lines. Never pass passwords or tokens.
const MAX_LENGTH = 254

const clean = (value) => (typeof value === 'string' ? value.slice(0, MAX_LENGTH) : value)

export const logSecurityEvent = (event, details = {}) => {
  const entry = { time: new Date().toISOString(), event }
  Object.entries(details).forEach(([key, value]) => {
    if (value !== undefined) entry[key] = clean(value)
  })
  console.warn(`[security] ${JSON.stringify(entry)}`)
}
